'use client';

interface MappingRule {
  id: string;
  sourceField: string;
  targetField: string;
  mappingType: string;
  status: string;
  transformConfig: unknown;
  aiConfidence: number | null;
  aiEvidenceSource: string | null;
  aiEvidenceSources?: string[];
  aiExplanation: string | null;
}

interface MappingRowProps {
  rule: MappingRule;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  index: number;
}

const confidenceColor = (c: number) => {
  if (c >= 0.85) return 'text-ai';
  if (c >= 0.65) return 'text-ai-text';
  return 'text-ai-text/60';
};

const statusStyle: Record<string, string> = {
  APPROVED:        'bg-success/10 text-success border-success/30',
  REJECTED:        'bg-danger/10 text-danger border-danger/30',
  PENDING_REVIEW:  'bg-warning/10 text-warning border-warning/30',
  DRAFT:           'bg-bg-canvas text-text-muted border-border-soft',
};

const sourceLabel: Record<string, string> = {
  INTERNAL_APPROVED: 'Internal Approved',
  SOURCE_PLATFORM_OFFICIAL_DOCS: 'Source Official Docs',
  TARGET_PLATFORM_OFFICIAL_DOCS: 'Target Official Docs',
  OFFICIAL_OPENAPI_SPEC: 'Official OpenAPI',
  OFFICIAL_FIELD_DICTIONARY: 'Official Field Dictionary',
  CURATED_SCHEMA_PACK: 'Curated Schema Pack',
};

export function MappingRow({ rule, onApprove, onReject, index }: MappingRowProps) {
  const ssty = statusStyle[rule.status] ?? 'bg-bg-canvas text-text-muted border-border-soft';
  const evidenceSources =
    rule.aiEvidenceSources && rule.aiEvidenceSources.length > 0
      ? rule.aiEvidenceSources
      : rule.aiEvidenceSource
      ? rule.aiEvidenceSource.split('|').map((s) => s.trim()).filter(Boolean)
      : [];

  return (
    <div className={`grid grid-cols-[1fr_auto_1fr_auto] items-center gap-4 px-5 py-4 border-b border-border-soft last:border-0 ${index % 2 === 0 ? '' : 'bg-bg-canvas/40'}`}>
      {/* Source field */}
      <div>
        <span className="font-mono text-sm text-text-main">{rule.sourceField}</span>
      </div>

      {/* Arrow + confidence */}
      <div className="flex flex-col items-center gap-1">
        <span className="material-symbols-outlined text-[18px] text-text-muted">arrow_forward</span>
        {rule.aiConfidence !== null && (
          <span className={`text-[10px] font-bold tabular-nums ${confidenceColor(rule.aiConfidence)}`}>
            {Math.round(rule.aiConfidence * 100)}%
          </span>
        )}
      </div>

      {/* Target field + details */}
      <div>
        <span className="font-mono text-sm text-text-main">{rule.targetField}</span>
        {rule.transformConfig != null ? (
          <p className="text-[11px] text-text-muted font-mono truncate mt-0.5">{JSON.stringify(rule.transformConfig)}</p>
        ) : null}
        {rule.aiExplanation && (
          <p className="text-[11px] text-text-muted mt-0.5 line-clamp-2">{rule.aiExplanation}</p>
        )}
        {evidenceSources.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {evidenceSources.map((source) => (
              <span
                key={`${rule.id}-${source}`}
                className="text-[10px] px-1.5 py-0.5 rounded-full border border-border-soft bg-bg-canvas text-text-muted"
                title={source}
              >
                {sourceLabel[source] ?? source}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${ssty}`}>
          {rule.status.replace('_', ' ')}
        </span>
        {rule.status === 'PENDING_REVIEW' && (
          <>
            <button
              onClick={() => onApprove(rule.id)}
              title="Approve"
              className="w-7 h-7 rounded-full bg-success/10 hover:bg-success/20 text-success flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">check</span>
            </button>
            <button
              onClick={() => onReject(rule.id)}
              title="Reject"
              className="w-7 h-7 rounded-full bg-danger/10 hover:bg-danger/20 text-danger flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
