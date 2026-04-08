'use client';

/* ------------------------------------------------------------------ */
/*  StoryboardConnector – engineered connector between cards           */
/* ------------------------------------------------------------------ */

interface StoryboardConnectorProps {
  orientation?: 'horizontal' | 'vertical';
}

export function StoryboardConnector({ orientation = 'horizontal' }: StoryboardConnectorProps) {
  if (orientation === 'vertical') {
    return (
      <div className="flex h-10 shrink-0 items-center justify-center py-1">
        <svg width="16" height="40" viewBox="0 0 16 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-400">
          <line x1="8" y1="0" x2="8" y2="30" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
          <path d="M4 28L8 34L12 28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex w-10 shrink-0 items-center justify-center py-2">
      <svg width="40" height="16" viewBox="0 0 40 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-400">
        <line x1="0" y1="8" x2="30" y2="8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
        <path d="M28 4L34 8L28 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </div>
  );
}
