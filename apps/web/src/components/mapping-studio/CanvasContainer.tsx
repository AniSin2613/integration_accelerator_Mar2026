'use client';

import { useState, useCallback, useMemo } from 'react';
import { SourceSchemaPane } from './SourceSchemaPane';
import { MappingCanvas } from './MappingCanvas';
import { TargetSchemaPane } from './TargetSchemaPane';
import { AddMappingModal } from './AddMappingModal';
import { ConflictResolutionModal } from './ConflictResolutionModal';

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
  businessName?: string | null;
  validationRule?: string | null;
  defaultValue?: string | null;
  source?: 'SCHEMA_PACK' | 'PROFILE';
}

interface CanvasContainerProps {
  sourceFields: StudioSchemaField[];
  targetFields: StudioSchemaField[];
  mappings: MappingField[];
  selectedMappingId: string | null;
  onMappingSelect: (id: string | null) => void;
  onMappingChange: (mappings: MappingField[]) => void;
  onTransformEdit: (mappingId: string) => void;
  targetProfileInfo?: { id: string; name: string; system: string; object: string; isPublished: boolean } | null;
}

interface ConflictInfo {
  newSourceField: string;
  existingMapping: MappingField;
  targetField: string;
}

export function CanvasContainer({
  sourceFields,
  targetFields,
  mappings,
  selectedMappingId,
  onMappingSelect,
  onMappingChange,
  onTransformEdit,
  targetProfileInfo,
}: CanvasContainerProps) {
  // Cross-pane highlight state
  const [hoveredMappingId, setHoveredMappingId] = useState<string | null>(null);
  const [hoveredSourceField, setHoveredSourceField] = useState<string | null>(null);
  const [hoveredTargetField, setHoveredTargetField] = useState<string | null>(null);

  // Source picker state for click-to-map on target
  const [sourcePickerTarget, setSourcePickerTarget] = useState<string | null>(null);

  // Modal states
  const [addMappingModalOpen, setAddMappingModalOpen] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);

  // Derive highlighted fields from hover state
  const highlightedSourceFields = useMemo(() => {
    const set = new Set<string>();
    if (hoveredMappingId) {
      const m = mappings.find(m => m.id === hoveredMappingId);
      if (m) {
        set.add(m.sourceField);
        m.sourceFields?.forEach(s => set.add(s));
      }
    }
    if (hoveredTargetField) {
      mappings.filter(m => m.targetField === hoveredTargetField).forEach(m => {
        set.add(m.sourceField);
        m.sourceFields?.forEach(s => set.add(s));
      });
    }
    if (selectedMappingId) {
      const m = mappings.find(m => m.id === selectedMappingId);
      if (m) {
        set.add(m.sourceField);
        m.sourceFields?.forEach(s => set.add(s));
      }
    }
    return set;
  }, [hoveredMappingId, hoveredTargetField, selectedMappingId, mappings]);

  const highlightedTargetFields = useMemo(() => {
    const set = new Set<string>();
    if (hoveredMappingId) {
      const m = mappings.find(m => m.id === hoveredMappingId);
      if (m) set.add(m.targetField);
    }
    if (hoveredSourceField) {
      mappings.filter(m => m.sourceField === hoveredSourceField || m.sourceFields?.includes(hoveredSourceField)).forEach(m => set.add(m.targetField));
    }
    if (selectedMappingId) {
      const m = mappings.find(m => m.id === selectedMappingId);
      if (m) set.add(m.targetField);
    }
    return set;
  }, [hoveredMappingId, hoveredSourceField, selectedMappingId, mappings]);

  const highlightedMappingIds = useMemo(() => {
    const set = new Set<string>();
    if (hoveredSourceField) {
      mappings.filter(m => m.sourceField === hoveredSourceField || m.sourceFields?.includes(hoveredSourceField)).forEach(m => set.add(m.id));
    }
    if (hoveredTargetField) {
      mappings.filter(m => m.targetField === hoveredTargetField).forEach(m => set.add(m.id));
    }
    return set;
  }, [hoveredSourceField, hoveredTargetField, mappings]);

  const handleAddMapping = useCallback((sourceField: string, targetField: string, transform = 'direct', transformConfig?: string) => {
    const newMapping: MappingField = {
      id: `mapping-${Date.now()}`,
      sourceField,
      targetField,
      transform,
      transformConfig,
    };
    onMappingChange([...mappings, newMapping]);
  }, [mappings, onMappingChange]);

  const handleRemoveMapping = useCallback((mappingId: string) => {
    onMappingChange(mappings.filter(m => m.id !== mappingId));
    if (selectedMappingId === mappingId) {
      onMappingSelect(null);
    }
  }, [mappings, selectedMappingId, onMappingSelect, onMappingChange]);

  // Core logic: map source to target, with conflict detection
  const handleMapSourceToTarget = useCallback((sourceField: string, targetField: string) => {
    const existingMapping = mappings.find(m => m.targetField === targetField);
    if (existingMapping) {
      // Conflict: target already mapped — show resolution modal
      setConflictInfo({ newSourceField: sourceField, existingMapping, targetField });
    } else {
      handleAddMapping(sourceField, targetField);
    }
  }, [mappings, handleAddMapping]);

  // Conflict resolution handlers
  const handleConflictReplace = useCallback(() => {
    if (!conflictInfo) return;
    const updated = mappings.filter(m => m.id !== conflictInfo.existingMapping.id);
    updated.push({
      id: `mapping-${Date.now()}`,
      sourceField: conflictInfo.newSourceField,
      targetField: conflictInfo.targetField,
      transform: 'direct',
    });
    onMappingChange(updated);
    setConflictInfo(null);
  }, [conflictInfo, mappings, onMappingChange]);

  const handleConflictCombine = useCallback(() => {
    if (!conflictInfo) return;
    const existing = conflictInfo.existingMapping;
    const existingSources = existing.sourceFields || [existing.sourceField];
    const combinedSources = [...existingSources, conflictInfo.newSourceField];
    const updated = mappings.map(m =>
      m.id === existing.id
        ? { ...m, sourceField: combinedSources[0], sourceFields: combinedSources, transform: 'concat' }
        : m
    );
    onMappingChange(updated);
    setConflictInfo(null);
    // Open transform editor for the composite mapping
    onTransformEdit(existing.id);
  }, [conflictInfo, mappings, onMappingChange, onTransformEdit]);

  const handleConflictConditional = useCallback(() => {
    if (!conflictInfo) return;
    const existing = conflictInfo.existingMapping;
    const existingSources = existing.sourceFields || [existing.sourceField];
    const combinedSources = [...existingSources, conflictInfo.newSourceField];
    const updated = mappings.map(m =>
      m.id === existing.id
        ? { ...m, sourceField: combinedSources[0], sourceFields: combinedSources, transform: 'conditional' }
        : m
    );
    onMappingChange(updated);
    setConflictInfo(null);
    onTransformEdit(existing.id);
  }, [conflictInfo, mappings, onMappingChange, onTransformEdit]);

  // Add Mapping modal handler
  const handleAddMappingFromModal = useCallback((sourceField: string, targetField: string, transform: string, transformConfig?: string) => {
    const existingMapping = mappings.find(m => m.targetField === targetField);
    if (existingMapping) {
      setAddMappingModalOpen(false);
      setConflictInfo({ newSourceField: sourceField, existingMapping, targetField });
    } else {
      handleAddMapping(sourceField, targetField, transform, transformConfig);
      setAddMappingModalOpen(false);
    }
  }, [mappings, handleAddMapping]);

  const handleClickToMap = useCallback((targetFieldPath: string) => {
    setSourcePickerTarget(targetFieldPath);
  }, []);

  const handleSourcePicked = useCallback((sourceFieldPath: string) => {
    if (sourcePickerTarget) {
      handleMapSourceToTarget(sourceFieldPath, sourcePickerTarget);
      setSourcePickerTarget(null);
    }
  }, [sourcePickerTarget, handleMapSourceToTarget]);

  // Unlink a mapping from its linked transform group
  const handleUnlinkTransform = useCallback((mappingId: string) => {
    const updated = mappings.map(m =>
      m.id === mappingId ? { ...m, linkedTransformGroup: undefined } : m
    );
    onMappingChange(updated);
  }, [mappings, onMappingChange]);

  // Reorder mappings via drag-and-drop
  const handleMappingsReorder = useCallback((reordered: MappingField[]) => {
    onMappingChange(reordered);
  }, [onMappingChange]);

  // Resolve labels for conflict modal
  const resolveLabel = (path: string) =>
    sourceFields.find(f => f.path === path)?.label ||
    targetFields.find(f => f.path === path)?.label ||
    path;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left Pane: Source Schema */}
      <SourceSchemaPane
        fields={sourceFields}
        mappedSourceFields={mappings.map(m => m.sourceField)}
        highlightedFields={highlightedSourceFields}
        onFieldHover={setHoveredSourceField}
        sourcePickerOpen={sourcePickerTarget !== null}
        onSourcePicked={handleSourcePicked}
        onSourcePickerClose={() => setSourcePickerTarget(null)}
      />

      {/* Center: Mapping Canvas */}
      <MappingCanvas
        sourceFields={sourceFields}
        targetFields={targetFields}
        mappings={mappings}
        selectedMappingId={selectedMappingId}
        highlightedMappingIds={highlightedMappingIds}
        onMappingSelect={onMappingSelect}
        onMappingRemove={handleRemoveMapping}
        onTransformEdit={onTransformEdit}
        onDrop={handleMapSourceToTarget}
        onMappingHover={setHoveredMappingId}
        onOpenAddModal={() => setAddMappingModalOpen(true)}
        onUnlinkTransform={handleUnlinkTransform}
        onMappingsReorder={handleMappingsReorder}
      />

      {/* Right Pane: Target Schema */}
      <TargetSchemaPane
        fields={targetFields}
        mappedTargetFields={mappings.map(m => m.targetField)}
        unmappedRequired={targetFields.filter(f => f.required && !mappings.find(m => m.targetField === f.path))}
        highlightedFields={highlightedTargetFields}
        onFieldHover={setHoveredTargetField}
        onDrop={handleMapSourceToTarget}
        onClickToMap={handleClickToMap}
        targetProfileInfo={targetProfileInfo}
      />

      {/* Add Mapping Modal */}
      <AddMappingModal
        isOpen={addMappingModalOpen}
        onClose={() => setAddMappingModalOpen(false)}
        onSave={handleAddMappingFromModal}
        sourceFields={sourceFields}
        targetFields={targetFields}
      />

      {/* Conflict Resolution Modal */}
      <ConflictResolutionModal
        isOpen={conflictInfo !== null}
        onClose={() => setConflictInfo(null)}
        sourceFieldLabel={conflictInfo ? resolveLabel(conflictInfo.newSourceField) : ''}
        targetFieldLabel={conflictInfo ? resolveLabel(conflictInfo.targetField) : ''}
        existingSourceLabel={conflictInfo ? resolveLabel(conflictInfo.existingMapping.sourceField) : ''}
        onReplace={handleConflictReplace}
        onCombine={handleConflictCombine}
        onConditional={handleConflictConditional}
      />
    </div>
  );
}
