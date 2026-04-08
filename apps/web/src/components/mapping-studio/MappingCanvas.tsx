'use client';

import { useState, useMemo } from 'react';

interface MappingField {
  id: string;
  sourceField: string;
  sourceFields?: string[];
  targetField: string;
  transform: string;
  required?: boolean;
  transformConfig?: string;
  linkedTransformGroup?: string;
  aiConfidence?: number;
}

interface StudioSchemaField {
  path: string;
  label: string;
  group: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  required?: boolean;
  helperText?: string;
  sampleValue?: string;
}

interface MappingCanvasProps {
  sourceFields: StudioSchemaField[];
  targetFields: StudioSchemaField[];
  mappings: MappingField[];
  selectedMappingId: string | null;
  highlightedMappingIds?: Set<string>;
  onMappingSelect: (id: string | null) => void;
  onMappingRemove: (id: string) => void;
  onTransformEdit: (mappingId: string) => void;
  onDrop: (sourceField: string, targetField: string) => void;
  onMappingHover?: (id: string | null) => void;
  onOpenAddModal?: () => void;
  onUnlinkTransform?: (mappingId: string) => void;
  onMappingsReorder?: (reordered: MappingField[]) => void;
}

export function MappingCanvas({
  sourceFields,
  targetFields,
  mappings,
  selectedMappingId,
  highlightedMappingIds,
  onMappingSelect,
  onMappingRemove,
  onTransformEdit,
  onDrop,
  onMappingHover,
  onOpenAddModal,
  onUnlinkTransform,
  onMappingsReorder,
}: MappingCanvasProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Build map of source → mapping count for linked transform indicator
  const sourceUsageCounts = useMemo(() => {
    const map: Record<string, number> = {};
    mappings.forEach(m => {
      map[m.sourceField] = (map[m.sourceField] || 0) + 1;
    });
    return map;
  }, [mappings]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    // Don't interfere with row reorder drags
    if (draggedId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'link';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (draggedId) return;
    e.preventDefault();
  };

  const handleRowHover = (id: string | null) => {
    setHoveredId(id);
    onMappingHover?.(id);
  };

  const handleRowDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-mapping-reorder', id);
  };

  const handleRowDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (draggedId && draggedId !== id) {
      setDragOverId(id);
    }
  };

  const handleRowDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedId || draggedId === targetId || !onMappingsReorder) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const fromIdx = mappings.findIndex(m => m.id === draggedId);
    const toIdx = mappings.findIndex(m => m.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const reordered = [...mappings];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    onMappingsReorder(reordered);
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleRowDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const resolveLabel = (path: string, fields: StudioSchemaField[]) =>
    fields.find(f => f.path === path)?.label || path;

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="flex-1 flex flex-col bg-background-light overflow-hidden"
    >
      {/* Canvas Header */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-border-soft bg-surface">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-text-muted">conversion_path</span>
          <h3 className="text-sm font-semibold text-text-main">Field Mappings</h3>
          <span className="text-[11px] font-medium text-text-muted bg-background-light px-2 py-0.5 rounded-full">
            {mappings.length}
          </span>
        </div>
        <button
          onClick={onOpenAddModal}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-text-muted hover:text-text-main hover:bg-background-light transition-colors border border-transparent hover:border-border-soft"
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
          Add Mapping
        </button>
      </div>

      {/* Mapping List */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        {mappings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <span className="material-symbols-outlined text-[40px] text-text-muted/20 mb-3">cable</span>
            <p className="text-sm font-medium text-text-muted mb-1">No mappings yet</p>
            <p className="text-[12px] text-text-muted/60 max-w-[260px] leading-relaxed">
              Drag a source field to a target field, or click an unmapped target to pick a source.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {mappings.map(mapping => {
              const isSelected = selectedMappingId === mapping.id;
              const isHovered = hoveredId === mapping.id;
              const isCrossHighlighted = highlightedMappingIds?.has(mapping.id) ?? false;
              const source = sourceFields.find(f => f.path === mapping.sourceField);
              const target = targetFields.find(f => f.path === mapping.targetField);
              const isComposite = mapping.sourceFields && mapping.sourceFields.length > 1;
              const isLinked = !!mapping.linkedTransformGroup;
              const sourceMultiTarget = sourceUsageCounts[mapping.sourceField] > 1;

              return (
                <div
                  key={mapping.id}
                  onClick={() => onMappingSelect(isSelected ? null : mapping.id)}
                  onMouseEnter={() => handleRowHover(mapping.id)}
                  onMouseLeave={() => handleRowHover(null)}
                  onDragOver={(e) => handleRowDragOver(e, mapping.id)}
                  onDragLeave={() => { if (dragOverId === mapping.id) setDragOverId(null); }}
                  onDrop={(e) => handleRowDrop(e, mapping.id)}
                  onDragEnd={handleRowDragEnd}
                  className={`relative rounded-lg border cursor-pointer transition-[background-color,border-color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    draggedId === mapping.id
                      ? 'opacity-40'
                      : dragOverId === mapping.id
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/[0.03]'
                      : isSelected
                      ? 'border-primary bg-surface shadow-soft ring-2 ring-primary/15'
                      : isCrossHighlighted
                      ? 'border-primary/40 bg-primary/[0.02] shadow-soft'
                      : isHovered
                      ? 'border-border-soft bg-surface shadow-soft -translate-y-[1px]'
                      : 'border-border-soft bg-surface'
                  }`}
                >
                  {isSelected && (
                    <span className="pointer-events-none absolute right-2 top-2 inline-flex h-2.5 w-2.5 items-center justify-center" aria-hidden="true">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-primary/35 motion-safe:animate-ping motion-reduce:animate-none" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                    </span>
                  )}
                  <div className="flex items-center px-3 py-2.5 gap-2">
                    {/* Drag handle */}
                    {onMappingsReorder && (
                      <div
                        draggable
                        onDragStart={(e) => { e.stopPropagation(); handleRowDragStart(e, mapping.id); }}
                        className="shrink-0 cursor-grab active:cursor-grabbing flex items-center justify-center w-5 h-8 -ml-1 rounded hover:bg-background-light text-text-muted/30 hover:text-text-muted/60 transition-colors"
                        title="Drag to reorder"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="material-symbols-outlined text-[14px]">drag_indicator</span>
                      </div>
                    )}
                    {/* Source side */}
                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                      <span className={`material-symbols-outlined text-[13px] shrink-0 ${isSelected ? 'text-primary' : 'text-text-muted/50'}`}>input</span>
                      <div className="min-w-0">
                        {isComposite ? (
                          <>
                            <p className="text-[12px] font-medium text-text-main truncate">
                              {mapping.sourceFields!.map(s => resolveLabel(s, sourceFields)).join(' + ')}
                            </p>
                            <p className="text-[10px] text-text-muted">
                              <span className="inline-flex items-center gap-0.5 text-primary/70 font-medium">
                                <span className="material-symbols-outlined text-[10px]">merge</span>
                                {mapping.sourceFields!.length} sources
                              </span>
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-[12px] font-medium text-text-main truncate">{source?.label || mapping.sourceField}</p>
                            <p className="text-[10px] text-text-muted truncate">{mapping.sourceField}</p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Arrow + Transform cluster */}
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`material-symbols-outlined text-[12px] ${isSelected ? 'text-primary/60' : 'text-text-muted/30'}`}>arrow_forward</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTransformEdit(mapping.id);
                        }}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold transition-colors ${
                          isSelected
                            ? 'border-primary/30 bg-primary/10 text-primary ring-1 ring-primary/20'
                            : 'border-border-soft bg-background-light text-text-muted hover:border-primary/30 hover:text-primary'
                        }`}
                        title="Edit transform"
                      >
                        <span className="material-symbols-outlined text-[12px]">bolt</span>
                        {mapping.transform}
                        {isLinked && (
                          <span className="material-symbols-outlined text-[10px] text-primary/50" title="Linked transform">link</span>
                        )}
                      </button>
                      <span className={`material-symbols-outlined text-[12px] ${isSelected ? 'text-primary/60' : 'text-text-muted/30'}`}>arrow_forward</span>
                    </div>

                    {/* Target side */}
                    <div className="flex-1 min-w-0 flex items-center gap-1.5 justify-end text-right">
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-text-main truncate">{target?.label || mapping.targetField}</p>
                        <p className="text-[10px] text-text-muted truncate">{mapping.targetField}</p>
                      </div>
                      <span className={`material-symbols-outlined text-[13px] shrink-0 ${isSelected ? 'text-primary' : 'text-success/60'}`}>output</span>
                    </div>

                    {/* AI confidence badge — visible only on AI-suggested mappings */}
                    {mapping.aiConfidence !== undefined && (
                      <span
                        title={`AI suggestion confidence: ${Math.round(mapping.aiConfidence * 100)}%`}
                        className={`shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          mapping.aiConfidence >= 0.8
                            ? 'bg-ai/15 text-ai'
                            : mapping.aiConfidence >= 0.6
                            ? 'bg-ai/10 text-ai-text'
                            : 'bg-ai-bg text-ai-text/70'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[11px]">auto_awesome</span>
                        {Math.round(mapping.aiConfidence * 100)}%
                      </span>
                    )}

                    {/* Remove */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMappingRemove(mapping.id);
                      }}
                      className="inline-flex items-center justify-center w-6 h-6 rounded-md hover:bg-danger-bg transition-colors text-text-muted/40 hover:text-danger-text shrink-0 ml-1"
                      title="Remove mapping"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>

                  {/* Expanded detail for selected row */}
                  {isSelected && (
                    <div className="border-t border-primary/10 px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-text-muted">
                      <span>Source type: <span className="font-medium text-text-main">{source?.type || '—'}</span></span>
                      <span className="text-border-soft">|</span>
                      <span>Target type: <span className="font-medium text-text-main">{target?.type || '—'}</span></span>
                      {target?.required && (
                        <>
                          <span className="text-border-soft">|</span>
                          <span className="text-warning-text font-medium">Required</span>
                        </>
                      )}
                      {isLinked && (
                        <>
                          <span className="text-border-soft">|</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUnlinkTransform?.(mapping.id);
                            }}
                            className="text-primary/70 hover:text-primary font-medium underline decoration-dotted"
                          >
                            Unlink transform
                          </button>
                        </>
                      )}
                      {sourceMultiTarget && !isLinked && (
                        <>
                          <span className="text-border-soft">|</span>
                          <span className="text-text-muted/70">Source used in {sourceUsageCounts[mapping.sourceField]} mappings</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
