import { Body, Controller, Get, Headers, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { DemoTargetType } from '@prisma/client';
import { AuthGuard } from '../../common/guards/auth.guard';
import { DemoTargetsService } from './demo-targets.service';

@UseGuards(AuthGuard)
@Controller('demo-targets')
export class DemoTargetsController {
  constructor(private readonly service: DemoTargetsService) {}

  @Get('receipts')
  listReceipts(@Query('integrationId') integrationId?: string, @Query('limit') limit?: string) {
    return this.service.listReceipts({ integrationId, limit: Number(limit) || 50 });
  }

  @Post('json/:targetName')
  async receiveJson(
    @Param('targetName') targetName: string,
    @Query('mode') modeRaw: string | undefined,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const mode = modeRaw === 'error' ? 'error' : 'success';
    const integrationDefId = this.firstHeader(headers, 'x-integration-id');
    const testRunId = this.firstHeader(headers, 'x-test-run-id');

    const responseStatusCode = mode === 'error' ? 502 : 200;
    const responseBody =
      mode === 'error'
        ? { status: 'error', target: targetName, code: 'DEMO_TARGET_FORCED_ERROR' }
        : { status: 'ok', target: targetName, accepted: true };

    await this.service.recordReceipt({
      targetType: DemoTargetType.JSON,
      targetName,
      mode,
      integrationDefId,
      testRunId,
      requestHeaders: headers,
      requestContentType: this.firstHeader(headers, 'content-type'),
      rawRequestBody: this.safeStringify(body),
      parsedJsonBody: body,
      responseStatusCode,
      rawResponseBody: JSON.stringify(responseBody),
      responseHeaders: { 'content-type': 'application/json' },
    });

    res.status(responseStatusCode).json(responseBody);
  }

  @Post('xml/:targetName')
  async receiveXml(
    @Param('targetName') targetName: string,
    @Query('mode') modeRaw: string | undefined,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const mode = modeRaw === 'error' ? 'error' : 'success';
    const integrationDefId = this.firstHeader(headers, 'x-integration-id');
    const testRunId = this.firstHeader(headers, 'x-test-run-id');

    const rawBody = this.extractRawBody(req);
    const responseStatusCode = mode === 'error' ? 502 : 200;
    const responseBody =
      mode === 'error'
        ? `<response><status>error</status><target>${this.escapeXml(targetName)}</target><code>DEMO_TARGET_FORCED_ERROR</code></response>`
        : `<response><status>ok</status><target>${this.escapeXml(targetName)}</target><accepted>true</accepted></response>`;

    await this.service.recordReceipt({
      targetType: DemoTargetType.XML,
      targetName,
      mode,
      integrationDefId,
      testRunId,
      requestHeaders: headers,
      requestContentType: this.firstHeader(headers, 'content-type'),
      rawRequestBody: rawBody,
      responseStatusCode,
      rawResponseBody: responseBody,
      responseHeaders: { 'content-type': 'application/xml' },
    });

    res.status(responseStatusCode).type('application/xml').send(responseBody);
  }

  private firstHeader(headers: Record<string, string | string[] | undefined>, key: string): string | null {
    const value = headers[key];
    if (Array.isArray(value)) return value[0] ?? null;
    if (typeof value === 'string' && value.length > 0) return value;
    return null;
  }

  private extractRawBody(req: Request): string {
    const anyReq = req as any;
    if (typeof anyReq.body === 'string') return anyReq.body;
    if (Buffer.isBuffer(anyReq.rawBody)) return anyReq.rawBody.toString('utf8');
    if (anyReq.body == null) return '';
    if (typeof anyReq.body === 'object') {
      try {
        return JSON.stringify(anyReq.body);
      } catch {
        return String(anyReq.body);
      }
    }
    return String(anyReq.body);
  }

  private safeStringify(value: unknown): string {
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value ?? {});
    } catch {
      return String(value);
    }
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
