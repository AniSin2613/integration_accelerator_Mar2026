'use client';

/* ------------------------------------------------------------------ */
/*  StoryboardConnector – engineered connector between cards           */
/* ------------------------------------------------------------------ */

export function StoryboardConnector() {
  return (
    <div className="flex items-center justify-center w-10 shrink-0 py-2">
      <svg width="40" height="16" viewBox="0 0 40 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-400">
        <line x1="0" y1="8" x2="30" y2="8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
        <path d="M28 4L34 8L28 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </div>
  );
}
