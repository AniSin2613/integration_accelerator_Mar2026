import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { PrismaService } from '../../prisma/prisma.service';

export interface AskFieldDto {
  targetField: string;
  sourceFields?: string[];
  confidenceThreshold?: number;
  maxCandidates?: number;
  context?: string;
}

export interface AskFieldCandidate {
  rank: number;
  sourceFields: string[];
  confidence: number;
  rationale: string;
  transformHint: string | null;
  mappingType: 'DIRECT' | 'DERIVED';
}

export interface AskFieldResult {
  targetField: string;
  candidates: AskFieldCandidate[];
  externalEvidence: [];
  contextRequired: boolean;
}

@Injectable()
export class CopilotService {
  private readonly logger = new Logger(CopilotService.name);
  private readonly bedrock: BedrockRuntimeClient | null;

  private static readonly ALIASES: Record<string, string[]> = {
    name:        ['fullname', 'full_name', 'displayname', 'display_name', 'label', 'title'],
    firstname:   ['first_name', 'forename', 'given_name', 'givenname'],
    lastname:    ['last_name', 'surname', 'family_name', 'familyname'],
    email:       ['email_address', 'emailaddress', 'mail', 'e_mail'],
    phone:       ['telephone', 'mobile', 'cell', 'phonenumber', 'phone_number', 'tel'],
    address:     ['addr', 'street', 'location', 'address_line', 'addr_line'],
    city:        ['town', 'municipality', 'locality'],
    country:     ['nation', 'country_code', 'countrycode'],
    zip:         ['postal_code', 'postalcode', 'postcode', 'zipcode'],
    amount:      ['price', 'cost', 'value', 'total', 'sum', 'fee', 'charge'],
    date:        ['datetime', 'timestamp', 'ts', 'created_at', 'updated_at', 'time'],
    id:          ['identifier', 'uuid', 'guid', 'key', 'ref', 'reference'],
    status:      ['state', 'flag', 'condition'],
    description: ['desc', 'detail', 'summary', 'note', 'comment', 'remarks'],
    quantity:    ['qty', 'count', 'num', 'number', 'amount'],
    type:        ['kind', 'category', 'class'],
  };

  private static readonly ALIAS_INDEX = (() => {
    const idx = new Map<string, string>();
    for (const [canonical, aliases] of Object.entries(CopilotService.ALIASES)) {
      idx.set(canonical, canonical);
      for (const alias of aliases) idx.set(alias, canonical);
    }
    return idx;
  })();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const region      = config.get<string>('AWS_BEDROCK_REGION') ?? config.get<string>('AWS_REGION');
    const bearerToken = config.get<string>('AWS_BEARER_TOKEN_BEDROCK');
    const accessKey   = config.get<string>('AWS_ACCESS_KEY_ID');
    const secretKey   = config.get<string>('AWS_SECRET_ACCESS_KEY');
    const sessionTok  = config.get<string>('AWS_SESSION_TOKEN');

    if (region && bearerToken) {
      this.bedrock = new BedrockRuntimeClient({ region, token: { token: bearerToken } });
      this.logger.log('Bedrock client initialised with bearer token');
    } else if (region && accessKey && secretKey) {
      this.bedrock = new BedrockRuntimeClient({
        region,
        credentials: {
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          ...(sessionTok ? { sessionToken: sessionTok } : {}),
        },
      });
      this.logger.log('Bedrock client initialised with IAM credentials');
    } else {
      this.bedrock = null;
      this.logger.warn('Bedrock credentials not configured — using local scoring only');
    }
  }

  async askField(integrationId: string, dto: AskFieldDto): Promise<AskFieldResult> {
    const integration = await this.prisma.integrationDefinition.findUnique({
      where: { id: integrationId },
      select: {
        id: true,
        mappingSets: {
          select: { rules: { select: { sourceField: true, targetField: true } } },
          orderBy: { version: 'desc' },
          take: 1,
        },
        templateVersion: {
          select: {
            schemaPacks: {
              select: { schemaPack: { select: { fields: { select: { path: true } } } } },
            },
          },
        },
      },
    });

    if (!integration) throw new NotFoundException(`Integration ${integrationId} not found`);

    let sourceFields: string[] = dto.sourceFields ?? [];
    if (sourceFields.length === 0 && integration.templateVersion) {
      for (const sp of integration.templateVersion.schemaPacks) {
        sourceFields.push(...sp.schemaPack.fields.map((f) => f.path));
      }
    }

    const existingSourceFields = new Set(
      (integration.mappingSets[0]?.rules ?? []).map((r) => r.sourceField),
    );
    const eligibleSources = sourceFields.filter((sf) => !existingSourceFields.has(sf));

    const threshold     = dto.confidenceThreshold ?? 0.45;
    const maxCandidates = dto.maxCandidates ?? 3;

    const candidates = await this.computeCandidates(
      eligibleSources, dto.targetField, threshold, maxCandidates, dto.context,
    );

    return {
      targetField: dto.targetField,
      candidates,
      externalEvidence: [],
      contextRequired: candidates.length === 0 && !dto.context,
    };
  }

  private async computeCandidates(
    sourceFields: string[],
    targetField: string,
    threshold: number,
    maxCandidates: number,
    context?: string,
  ): Promise<AskFieldCandidate[]> {
    const localScored = sourceFields.map((sf) => ({
      sf,
      localScore: this.localScore(sf, targetField, context),
    }));

    // High-confidence local hits (exact token containment / alias) — skip Bedrock
    const certain = localScored.filter((x) => x.localScore >= 0.82);
    if (certain.length >= maxCandidates) {
      return this.toResult(
        certain
          .sort((a, b) => b.localScore - a.localScore)
          .slice(0, maxCandidates)
          .map(({ sf, localScore }) => ({ sf, score: localScore })),
        targetField,
      );
    }

    // Uncertain fields — Bedrock Titan Embeddings fallback
    const uncertain = localScored.filter((x) => x.localScore < 0.82);
    let embeddingScored: Array<{ sf: string; score: number }> = [];

    if (this.bedrock && uncertain.length > 0) {
      try {
        const [targetVec, ...sourceVecs] = await Promise.all([
          this.embed(targetField),
          ...uncertain.map((x) => this.embed(x.sf)),
        ]);
        embeddingScored = uncertain.map(({ sf }, i) => ({
          sf,
          score: this.cosine(sourceVecs[i], targetVec),
        }));
      } catch (err) {
        this.logger.warn(`Bedrock embedding error — using local scores: ${err}`);
        embeddingScored = uncertain.map(({ sf, localScore }) => ({ sf, score: localScore }));
      }
    } else {
      embeddingScored = uncertain.map(({ sf, localScore }) => ({ sf, score: localScore }));
    }

    const allScored = [
      ...certain.map(({ sf, localScore }) => ({ sf, score: localScore })),
      ...embeddingScored,
    ];

    return this.toResult(
      allScored
        .filter((x) => x.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxCandidates),
      targetField,
    );
  }

  private toResult(
    scored: Array<{ sf: string; score: number }>,
    targetField: string,
  ): AskFieldCandidate[] {
    return scored.map(({ sf, score }, i) => ({
      rank: i + 1,
      sourceFields: [sf],
      confidence: Math.round(score * 100) / 100,
      rationale: this.buildRationale(sf, targetField, score),
      transformHint: this.suggestTransform(sf, targetField),
      mappingType: 'DIRECT' as const,
    }));
  }

  // Phase 1 — improved local scorer
  // Hierarchy:
  //   1. Exact normalised match                                 → 1.0
  //   2. Exact token containment in either direction            → 0.90
  //   3. Synonym / alias canonical match                        → 0.90
  //   4. Jaccard(tokens) * 0.5 + bigramSim * 0.5  (was 0.4/0.6) → 0.0–0.80
  //   5. Context boost                                          → +0.10

  private localScore(source: string, target: string, context?: string): number {
    const a = this.normalise(source);
    const b = this.normalise(target);

    if (a === b) return 1.0;

    const tokA = a.split(' ');
    const tokB = b.split(' ');
    const setA = new Set(tokA);
    const setB = new Set(tokB);
    if (tokB.every((t) => setA.has(t)) || tokA.every((t) => setB.has(t))) return 0.90;

    const canonA = CopilotService.ALIAS_INDEX.get(a.replace(/ /g, ''));
    const canonB = CopilotService.ALIAS_INDEX.get(b.replace(/ /g, ''));
    if (canonA && canonB && canonA === canonB) return 0.90;

    const intersection = [...setA].filter((t) => setB.has(t)).length;
    const union        = new Set([...setA, ...setB]).size;
    const jaccard      = union > 0 ? intersection / union : 0;
    const bigram       = this.bigramSim(a, b);
    let score          = jaccard * 0.5 + bigram * 0.5;

    if (context) {
      const ctx = context.toLowerCase();
      if (ctx.includes(a) || ctx.includes(source.toLowerCase())) {
        score = Math.min(1, score + 0.10);
      }
    }

    return score;
  }

  private normalise(s: string): string {
    return s.toLowerCase().replace(/[_.\-/\\]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private bigramSim(a: string, b: string): number {
    const bg = (s: string) => {
      const out: string[] = [];
      for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
      return out;
    };
    const ba = bg(a);
    const bb = bg(b);
    if (!ba.length && !bb.length) return 1;
    if (!ba.length || !bb.length) return 0;
    const freq = new Map<string, number>();
    bb.forEach((g) => freq.set(g, (freq.get(g) ?? 0) + 1));
    let matches = 0;
    ba.forEach((g) => {
      const cnt = freq.get(g) ?? 0;
      if (cnt > 0) { matches++; freq.set(g, cnt - 1); }
    });
    return (2 * matches) / (ba.length + bb.length);
  }

  // Phase 2 — Bedrock Titan Embeddings

  private async embed(text: string): Promise<number[]> {
    const body   = JSON.stringify({ inputText: this.normalise(text) });
    const cmd    = new InvokeModelCommand({
      modelId:     'amazon.titan-embed-text-v2:0',
      contentType: 'application/json',
      accept:      'application/json',
      body:        Buffer.from(body),
    });
    const resp   = await this.bedrock!.send(cmd);
    const parsed = JSON.parse(Buffer.from(resp.body).toString()) as { embedding: number[] };
    return parsed.embedding;
  }

  private cosine(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i]; normA += a[i] * a[i]; normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  private buildRationale(source: string, target: string, confidence: number): string {
    const pct = Math.round(confidence * 100);
    if (pct === 100) return `Exact match between "${source}" and "${target}".`;
    if (pct >= 90)   return `Strong naming match between "${source}" and "${target}" — likely a direct mapping.`;
    if (pct >= 70)   return `Good similarity between "${source}" and "${target}" — verify semantics before applying.`;
    if (pct >= 50)   return `Moderate similarity (${pct}%) between "${source}" and "${target}" — review carefully.`;
    return `Low-confidence match (${pct}%) between "${source}" and "${target}". Provide context to refine.`;
  }

  private suggestTransform(source: string, target: string): string | null {
    const s = source.toLowerCase();
    const t = target.toLowerCase();
    if ((s.includes('date') || s.includes('time')) && !t.includes('date') && !t.includes('time')) {
      return 'Convert to date string — e.g. ISO 8601 (yyyy-MM-dd)';
    }
    if (t.includes('date') && !s.includes('date')) {
      return 'Parse source to date — confirm it contains a valid date string or Unix timestamp';
    }
    if ((s.includes('amount') || s.includes('price') || s.includes('cost')) &&
        (t.includes('amount') || t.includes('price') || t.includes('cost'))) {
      return 'Verify currency unit and decimal precision alignment';
    }
    if (s.includes('firstname') && t.includes('fullname')) {
      return 'Concatenate first name + last name: ${firstName} ${lastName}';
    }
    if (s.includes('phone') && t.includes('phone')) {
      return 'Normalise phone to E.164 format if used across regions';
    }
    return null;
  }
}
