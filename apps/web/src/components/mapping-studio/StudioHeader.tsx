'use client';

interface StudioHeaderProps {
  integrationName: string;
  version?: string;
  sourceObject: string;
  targetObject: string;
  actionsDisabled?: boolean;
  onBack: () => void;
  onSave: () => void;
  onValidate: () => void;
  onPreview: () => void;
  onSuggest: () => void;
  onAskAI: () => void;
  unreviewedAiCount?: number;
  unsavedChanges?: boolean;
}

export function StudioHeader({
  integrationName,
  version,
  sourceObject,
  targetObject,
  actionsDisabled,
  onBack,
  onSave,
  onValidate,
  onPreview,
  onSuggest,
  onAskAI,
  unreviewedAiCount = 0,
  unsavedChanges,
}: StudioHeaderProps) {
  return (
    <header className="border-b border-border-soft bg-surface shrink-0">
      <div className="flex items-center justify-between px-5 py-3">
        {/* Left: Back + Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border-soft hover:bg-background-light transition-colors text-text-muted"
            title="Back to Builder"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <div>
            <h1 className="text-base font-semibold text-text-main">Map & Transform</h1>
            <p className="text-[12px] text-text-muted">
              <span className="font-medium text-text-main/70">{integrationName}</span>
              <span className="mx-1.5 text-border-soft">·</span>
              <span className="inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[11px] text-emerald-500">cloud_download</span>
                {sourceObject}
              </span>
              <span className="mx-1.5">→</span>
              <span className="inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[11px] text-sky-500">cloud_upload</span>
                {targetObject}
              </span>
              {version && <span className="ml-1.5 text-text-muted/60">v{version}</span>}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {unsavedChanges && (
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-warning-text bg-warning-bg px-2.5 py-1.5 rounded-lg mr-2">
              <span className="material-symbols-outlined text-[14px]">edit_note</span>
              Unsaved
            </div>
          )}

          {/* Integration Copilot — Suggest Required Mappings */}
          <div className="relative">
            <button
              onClick={onSuggest}
              disabled={actionsDisabled}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-ai bg-ai-bg border border-ai/20 transition-colors hover:bg-ai/10 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-ai-bg"
              title="Integration Copilot: suggest mappings for all unmapped required target fields"
            >
              <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
              Suggest Required
            </button>
            {unreviewedAiCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-ai px-1 text-[9px] font-bold text-white"
                title={`${unreviewedAiCount} AI suggestion${unreviewedAiCount === 1 ? '' : 's'} pending your review`}
              >
                {unreviewedAiCount}
              </span>
            )}
          </div>

          {/* Integration Copilot — Ask AI for a specific field */}
          <button
            onClick={onAskAI}
            disabled={actionsDisabled}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-ai bg-ai-bg border border-ai/20 transition-colors hover:bg-ai/10 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-ai-bg"
            title="Integration Copilot: conversational field mapping assistant"
          >
            <span className="material-symbols-outlined text-[16px]">chat_bubble</span>
            Ask AI
          </button>

          <div className="w-px h-6 bg-border-soft mx-1" />

          <button
            onClick={onValidate}
            disabled={actionsDisabled}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-text-muted transition-colors hover:bg-background-light hover:text-text-main disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent disabled:hover:text-text-muted"
            title="Validate mappings"
          >
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            Validate
          </button>

          <button
            onClick={onPreview}
            disabled={actionsDisabled}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-text-muted transition-colors hover:bg-background-light hover:text-text-main disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent disabled:hover:text-text-muted"
            title="Preview & Test"
          >
            <span className="material-symbols-outlined text-[16px]">preview</span>
            Preview &amp; Test
          </button>

          <div className="w-px h-6 bg-border-soft mx-1" />

          <button
            onClick={onSave}
            disabled={actionsDisabled}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[12px] font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-primary"
            title="Save mappings"
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            Save
          </button>
        </div>
      </div>
    </header>
  );
}
