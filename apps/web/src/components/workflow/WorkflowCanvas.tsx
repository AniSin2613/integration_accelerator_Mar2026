'use client';

import { type ReactNode } from 'react';

export type BoxRole = 'trigger' | 'source' | 'mapping' | 'target' | 'error';

const roleConfig: Record<BoxRole, { icon: string; label: string; color: string; borderColor: string }> = {
  trigger:  { icon: 'play_circle',    label: 'Trigger',  color: 'bg-accent-blue/10',  borderColor: 'border-accent-blue/40' },
  source:   { icon: 'cloud_download', label: 'Source',   color: 'bg-warning/10',       borderColor: 'border-warning/40' },
  mapping:  { icon: 'transform',      label: 'Mapping',  color: 'bg-primary/10',       borderColor: 'border-primary/40' },
  target:   { icon: 'cloud_upload',   label: 'Target',   color: 'bg-success/10',       borderColor: 'border-success/40' },
  error:    { icon: 'error_outline',  label: 'Error',    color: 'bg-danger/10',        borderColor: 'border-danger/30' },
};

export interface WorkflowBoxDef {
  id: string;
  role: BoxRole;
  title: string;
  subtitle?: string;
  config?: Record<string, unknown>;
}

interface WorkflowBoxProps {
  box: WorkflowBoxDef;
  selected?: boolean;
  onClick?: () => void;
}

export function WorkflowBox({ box, selected, onClick }: WorkflowBoxProps) {
  const cfg = roleConfig[box.role];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-52 rounded-xl border-2 p-4 text-left transition-all focus:outline-none
        ${cfg.color} ${cfg.borderColor}
        ${selected ? 'ring-2 ring-primary ring-offset-2 shadow-lg' : 'hover:shadow-md hover:scale-[1.02]'}
      `}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`material-symbols-outlined text-[20px] ${selected ? 'text-primary' : 'text-text-muted'}`}>
          {cfg.icon}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
          {cfg.label}
        </span>
      </div>
      <p className="font-semibold text-text-main text-sm leading-tight">{box.title}</p>
      {box.subtitle && (
        <p className="text-[11px] text-text-muted mt-0.5 font-mono truncate">{box.subtitle}</p>
      )}
    </button>
  );
}

/** Arrow connector between boxes */
export function WorkflowArrow({ dashed = false }: { dashed?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center w-10 flex-shrink-0">
      <div className={`w-full h-0.5 ${dashed ? 'border-t-2 border-dashed border-danger/40' : 'bg-border-soft'}`} />
      <span className="material-symbols-outlined text-[18px] text-text-muted -mr-1">chevron_right</span>
    </div>
  );
}

interface WorkflowCanvasProps {
  boxes: WorkflowBoxDef[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  children?: ReactNode;
}

export function WorkflowCanvas({ boxes, selectedId, onSelect, children }: WorkflowCanvasProps) {
  // Separate error handler box (rendered below main flow)
  const mainFlow = boxes.filter((b) => b.role !== 'error');
  const errorBox = boxes.find((b) => b.role === 'error');

  return (
    <div className="flex flex-col gap-8 items-center">
      {/* Main horizontal flow */}
      <div className="flex items-center gap-0">
        {mainFlow.map((box, i) => (
          <div key={box.id} className="flex items-center">
            <WorkflowBox box={box} selected={selectedId === box.id} onClick={() => onSelect?.(box.id)} />
            {i < mainFlow.length - 1 && <WorkflowArrow />}
          </div>
        ))}
      </div>

      {/* Error handler branch */}
      {errorBox && (
        <div className="flex flex-col items-center gap-0">
          <div className="h-6 w-0.5 border-l-2 border-dashed border-danger/40" />
          <WorkflowBox
            box={errorBox}
            selected={selectedId === errorBox.id}
            onClick={() => onSelect?.(errorBox.id)}
          />
        </div>
      )}

      {children}
    </div>
  );
}
