'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/* ------------------------------------------------------------------ */
/*  useWorkbenchResize – hook for vertical drag-to-resize              */
/* ------------------------------------------------------------------ */

interface UseWorkbenchResizeOptions {
  /** Minimum panel height (px) — cannot drag below this */
  minHeight: number;
  /** Maximum panel height (px) — cannot drag above this */
  maxHeight: number;
  /** Starting height */
  defaultHeight: number;
}

export function useWorkbenchResize({ minHeight, maxHeight, defaultHeight }: UseWorkbenchResizeOptions) {
  const [height, setHeight] = useState(defaultHeight);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    startY.current = e.clientY;
    startH.current = height;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }, [height]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    // dragging upward increases height (clientY decreases)
    const delta = startY.current - e.clientY;
    const next = Math.min(maxHeight, Math.max(minHeight, startH.current + delta));
    setHeight(next);
  }, [minHeight, maxHeight]);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  return { height, onPointerDown, onPointerMove, onPointerUp };
}

/* ------------------------------------------------------------------ */
/*  WorkbenchResizeHandle – visible drag handle at top center           */
/* ------------------------------------------------------------------ */

interface WorkbenchResizeHandleProps {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
}

export function WorkbenchResizeHandle({ onPointerDown, onPointerMove, onPointerUp }: WorkbenchResizeHandleProps) {
  return (
    <div
      className="flex h-3 w-full cursor-ns-resize items-center justify-center touch-none select-none group"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div className="h-1 w-10 rounded-full bg-slate-300 transition-colors group-hover:bg-primary/40 group-active:bg-primary" />
    </div>
  );
}
