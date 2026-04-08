'use client';

import { useState } from 'react';
import { SecurityRedactionBadge } from './SecurityRedactionBadge';

interface StepOutputPanelProps {
  title: string;
  status: string;
  timing: string;
  errorCount: number;
  displayMode?: 'summary' | 'expanded';
  onToggleState?: () => void;
}

export function StepOutputPanel({
  title,
  status,
  timing,
  errorCount,
  displayMode = 'summary',
  onToggleState,
}: StepOutputPanelProps) {
  const [selectedTab, setSelectedTab] = useState<'input' | 'output' | 'headers' | 'status' | 'timing' | 'errors'>('output');
  const tabs = ['input', 'output', 'headers', 'status', 'timing', 'errors'] as const;
  const errorTone = errorCount === 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200';

  if (displayMode === 'summary') {
    const SummaryWrapper = onToggleState ? 'button' : 'div';

    return (
      <SummaryWrapper
        {...(onToggleState
          ? {
              type: 'button' as const,
              onClick: onToggleState,
            }
          : {})}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 text-left text-slate-700 transition-colors hover:bg-slate-300/25"
      >
        <span className="text-[11px] font-semibold text-slate-800">{title}</span>
        <span className="text-[11px] text-slate-600">{status}</span>
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${errorTone}`}>
          {errorCount} error{errorCount !== 1 ? 's' : ''}
        </span>
        <span className="text-[11px] text-slate-600">{timing}</span>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <SecurityRedactionBadge level="restricted" text="Redacted" />
          {onToggleState && <span className="material-symbols-outlined text-[18px] text-slate-500">expand_less</span>}
        </div>
      </SummaryWrapper>
    );
  }

  return (
    <div className="flex min-h-0 flex-col bg-slate-100/90">
      <div className="flex-none border-b border-slate-300/80 px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-slate-800">{title}</p>
            <p className="text-[10px] text-slate-500">Payload preview</p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <SecurityRedactionBadge level="restricted" text="Redacted" />
            {onToggleState && (
              <button
                type="button"
                onClick={onToggleState}
                className="inline-flex items-center gap-1 text-slate-600 transition-colors hover:text-slate-900"
              >
                <span className="material-symbols-outlined text-[18px]">expand_more</span>
              </button>
            )}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700">{status}</span>
          <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold ${errorTone}`}>{errorCount} error{errorCount !== 1 ? 's' : ''}</span>
          <span className="inline-flex rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700">{timing}</span>
        </div>
      </div>

      <div className="flex-none border-b border-slate-300/80 bg-white/65 px-4 py-1.5">
        <div className="flex gap-1 overflow-x-auto whitespace-nowrap scrollbar-thin">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setSelectedTab(tab)}
            className={`rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.04em] transition-colors ${
              selectedTab === tab
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:bg-white hover:text-slate-800'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50 p-3">
        {selectedTab === 'input' && (
          <div className="rounded-md border border-slate-200 bg-white p-2.5 text-[11px] text-text-muted font-mono">
            <pre className="whitespace-pre-wrap break-words text-[10px]">{`{
  "request": "payload preview",
  "note": "Input data structure would appear here",
  "redacted": "${displayMode === 'expanded' ? 'Full payload available in Dev environment' : 'Redacted'}"
}`}</pre>
          </div>
        )}
        {selectedTab === 'output' && (
          <div className="rounded-md border border-slate-200 bg-white p-2.5 text-[11px] text-text-muted font-mono">
            <pre className="whitespace-pre-wrap break-words text-[10px]">{`{
  "response": "payload preview",
  "note": "Output data structure would appear here",
  "redacted": "${displayMode === 'expanded' ? 'Full payload available in Dev environment' : 'Redacted'}"
}`}</pre>
          </div>
        )}
        {selectedTab === 'headers' && (
          <div className="rounded-md border border-slate-200 bg-white p-2.5 text-[11px] text-text-muted font-mono">
            <div className="space-y-1">
              <div>Content-Type: application/json</div>
              <div>Authorization: Bearer ••••••••••</div>
              <div>X-Request-ID: req_1234567890</div>
              <div className="text-text-muted/60 mt-2">(Additional headers would appear here)</div>
            </div>
          </div>
        )}
        {selectedTab === 'status' && (
          <div className="rounded-md border border-slate-200 bg-white p-2.5 text-[11px] space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Request Status: <span className="font-semibold text-text-main">Success</span></span>
            </div>
            <div>HTTP Code: <span className="font-semibold text-emerald-600">200</span></div>
            <div className="text-text-muted mt-2 text-[10px]">Step completed without blocking errors.</div>
          </div>
        )}
        {selectedTab === 'timing' && (
          <div className="rounded-md border border-slate-200 bg-white p-2.5 text-[11px] space-y-1">
            <div>Total Duration: <span className="font-semibold text-text-main">{timing}</span></div>
            <div>Request Time: <span className="font-semibold text-text-main">85ms</span></div>
            <div>Processing Time: <span className="font-semibold text-text-main">42ms</span></div>
            <div>Response Time: <span className="font-semibold text-text-main">15ms</span></div>
          </div>
        )}
        {selectedTab === 'errors' && (
          <div className="rounded-md border border-slate-200 bg-white p-2.5 text-[11px]">
            {errorCount === 0 ? (
              <div className="flex items-center gap-2 text-emerald-700">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                <span>No errors detected</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="bg-danger-bg text-danger-text p-2 rounded text-[10px]">
                  Error details would appear here
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
