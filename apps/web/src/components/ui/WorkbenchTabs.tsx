'use client';

export type WorkbenchTabId = 'design' | 'diagnostics';

const TAB_LABELS: Record<WorkbenchTabId, string> = {
  design: 'Design',
  diagnostics: 'Run / Diagnostics',
};

interface WorkbenchTabsProps {
  activeTab: WorkbenchTabId;
  onTabChange: (tab: WorkbenchTabId) => void;
}

export function WorkbenchTabs({ activeTab, onTabChange }: WorkbenchTabsProps) {
  const tabs: WorkbenchTabId[] = ['design', 'diagnostics'];

  return (
    <div className="px-5 border-t border-b border-border-soft bg-slate-50/40" role="tablist" aria-label="Workbench tabs">
      <div className="flex items-stretch gap-1 overflow-x-auto py-1.5 whitespace-nowrap scrollbar-thin">
        {tabs.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab)}
              className={`relative rounded-md border px-3 py-1.5 text-[11px] transition-colors ${
                isActive
                  ? 'font-semibold text-primary border-primary/30 bg-primary/10'
                  : 'font-medium text-text-muted border-transparent hover:border-border-soft hover:bg-white/80 hover:text-text-main'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
