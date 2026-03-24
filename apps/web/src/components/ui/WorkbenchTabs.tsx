'use client';

export type WorkbenchTabId = 'design' | 'output' | 'validation' | 'test';

const TAB_LABELS: Record<WorkbenchTabId, string> = {
  design: 'Design',
  output: 'Step Output',
  validation: 'Validation',
  test: 'Test Results',
};

interface WorkbenchTabsProps {
  activeTab: WorkbenchTabId;
  onTabChange: (tab: WorkbenchTabId) => void;
}

export function WorkbenchTabs({ activeTab, onTabChange }: WorkbenchTabsProps) {
  const tabs: WorkbenchTabId[] = ['design', 'output', 'validation', 'test'];

  return (
    <div className="flex items-center gap-0 px-5 border-t border-border-soft/60 bg-slate-50/40" role="tablist" aria-label="Workbench tabs">
      {tabs.map((tab) => {
        const isActive = tab === activeTab;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab)}
            className={`px-3 py-1.5 text-[11px] transition-colors border-b-2 ${
              isActive
                ? 'font-semibold text-primary border-primary'
                : 'font-medium text-text-muted hover:text-text-main border-transparent'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        );
      })}
    </div>
  );
}
