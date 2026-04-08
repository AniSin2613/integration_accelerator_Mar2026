'use client';

import { useEffect, useRef, useState } from 'react';
import { StoryboardCard, CardRow } from '@/components/ui/StoryboardCard';
import { StoryboardConnector } from '@/components/ui/StoryboardConnector';
import type { CardStatus } from '@/components/ui/StoryboardCard';
import { WorkflowNodeIcon } from '@/components/ui/WorkflowNodeIcon';
import { getWorkflowNodeIconByKey, type WorkflowNodeKey } from '@/lib/workflow-node-icons';
import {
  type BuilderState,
  type BuilderStepId,
  type TargetProfileStatus,
  isTriggerComplete,
  isSourceComplete,
  isMappingComplete,
  isValidationComplete,
  isTargetComplete,
  isResponseHandlingComplete,
  isMonitoringComplete,
  getSourceTargetWarning,
} from './types';

const PROFILE_STATUS_LABELS: Record<TargetProfileStatus, string> = {
  'none': 'No profile',
  'baseline-only': 'Baseline only',
  'profile-ready': 'Profile ready',
  'overlay-active': 'Overlay active',
  'drift-suspected': 'Drift suspected',
};

function triggerStatus(s: BuilderState): CardStatus {
  return isTriggerComplete(s.trigger) ? 'configured' : 'not-configured';
}
function sourceStatus(s: BuilderState): CardStatus {
  if (!s.sourceGroup.primary.connectionId) return 'not-configured';
  return isSourceComplete(s.sourceGroup) ? 'configured' : 'warning';
}
function mappingStatus(s: BuilderState): CardStatus {
  if (s.mapping.mappings.length === 0) return 'not-configured';
  if (s.mapping.unmappedTargetFields.length > 0) return 'warning';
  return 'configured';
}
function validationStatus(s: BuilderState): CardStatus {
  return isValidationComplete(s.validation) ? 'configured' : 'not-configured';
}
function targetStatus(s: BuilderState): CardStatus {
  const warn = getSourceTargetWarning(s);
  if (warn === 'block') return 'error';
  if (s.targetGroup.targets.length === 0) return 'not-configured';
  if (warn === 'warn') return 'warning';
  return isTargetComplete(s.targetGroup) ? 'configured' : 'warning';
}
function responseStatus(s: BuilderState): CardStatus {
  return isResponseHandlingComplete(s.responseHandling) ? 'configured' : 'warning';
}
function operationsStatus(s: BuilderState): CardStatus {
  return isMonitoringComplete(s.operations) ? 'configured' : 'not-configured';
}

interface StoryboardCanvasProps {
  state: BuilderState;
  activeStep: BuilderStepId;
  onSelectStep: (id: BuilderStepId) => void;
  validationTab?: 'rules' | 'error-handler';
  onValidationTabChange?: (tab: 'rules' | 'error-handler') => void;
}

export function StoryboardCanvas({ state, activeStep, onSelectStep, validationTab, onValidationTabChange }: StoryboardCanvasProps) {
  const [zoomPct, setZoomPct] = useState(100);
  const stw = getSourceTargetWarning(state);
  const primaryTarget = state.targetGroup.targets[0];
  const additionalTarget = state.targetGroup.targets[1];
  const additionalSource = state.sourceGroup.enrichmentSources[0];
  const hasAdditionalSource = Boolean(additionalSource);
  const hasAdditionalTarget = state.targetGroup.targets.length > 1;
  const requiredTotalCount = state.targetGroup.targetProfileState?.effectiveRequiredCount
    ?? (state.mapping.mappings.filter((m) => m.required).length + state.mapping.unmappedTargetFields.length);
  const requiredMappedCount = Math.max(0, requiredTotalCount - state.mapping.unmappedTargetFields.length);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedCardRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    startScrollTop: 0,
  });

  type CanvasCard = {
    key: string;
    cardKey: string;
    nodeKey: WorkflowNodeKey;
    title: string;
    step: BuilderStepId;
    status: CardStatus;
    statusLabel?: string;
    rows: Array<{ label: string; value: string; mono?: boolean }>;
  };

  const additionalSourceCards: CanvasCard[] = hasAdditionalSource
    ? [
        {
          key: 'source-additional',
          cardKey: 'source',
          nodeKey: 'source',
          title: 'Additional Source',
          step: 'sourceGroup',
          status: 'configured',
          rows: [
            { label: 'Connection', value: additionalSource?.connectionName || 'Configured source' },
            { label: 'Interface', value: additionalSource?.interfaceName || 'Not set' },
            { label: 'Purpose', value: additionalSource?.purpose || 'Join source' },
          ],
        },
        {
          key: 'source-combiner',
          cardKey: 'mapping',
          nodeKey: 'mapping',
          title: 'Combine Inputs',
          step: 'sourceGroup',
          status: sourceStatus(state) === 'configured' ? 'configured' : 'warning',
          rows: [
            { label: 'Mode', value: 'Merge objects' },
            { label: 'Sources', value: '2 connected' },
            { label: 'Output', value: 'Unified payload' },
          ],
        },
      ]
    : [];

  const additionalTargetCards: CanvasCard[] = hasAdditionalTarget
    ? [
        {
          key: 'target-splitter',
          cardKey: 'mapping',
          nodeKey: 'mapping',
          title: 'Split Output',
          step: 'targetGroup',
          status: targetStatus(state) === 'error' ? 'warning' : 'configured',
          rows: [
            { label: 'Mode', value: 'Broadcast route' },
            { label: 'Targets', value: `${state.targetGroup.targets.length} connected` },
            { label: 'Rule', value: 'Single payload fan-out' },
          ],
        },
        {
          key: 'target-additional',
          cardKey: 'target',
          nodeKey: 'target',
          title: 'Additional Target',
          step: 'targetGroup',
          status: additionalTarget?.connectionId ? 'configured' : 'warning',
          rows: [
            { label: 'Connection', value: additionalTarget?.connectionName || 'Not selected' },
            { label: 'Interface', value: additionalTarget?.businessObject || 'Not set' },
            { label: 'Operation', value: additionalTarget?.operation || 'POST' },
          ],
        },
      ]
    : [];

  const cards: CanvasCard[] = [
    {
      key: 'trigger',
      cardKey: 'trigger',
      nodeKey: 'trigger',
      title: 'Trigger',
      step: 'trigger',
      status: triggerStatus(state),
      rows: [
        { label: 'Type', value: state.trigger.triggerType },
        ...(state.trigger.triggerType === 'Schedule / Cron' && state.trigger.cronExpression
          ? [{ label: 'Cron', value: state.trigger.cronExpression, mono: true }]
          : []),
        { label: 'Timezone', value: state.trigger.timezone },
      ],
    },
    {
      key: 'source-primary',
      cardKey: 'source',
      nodeKey: 'sourceGroup',
      title: 'Source',
      step: 'sourceGroup',
      status: sourceStatus(state),
      rows: [
        { label: 'Primary', value: state.sourceGroup.primary.connectionName || 'Not selected' },
        { label: 'Interface', value: state.sourceGroup.primary.businessObject || 'Not set' },
        { label: 'Pattern', value: state.sourceGroup.processingPattern },
      ],
    },
    ...additionalSourceCards,
    {
      key: 'mapping',
      cardKey: 'mapping',
      nodeKey: 'mapping',
      title: 'Mapping',
      step: 'mapping',
      status: mappingStatus(state),
      rows: [
        { label: 'Mapped', value: `${state.mapping.mappings.length}` },
        { label: 'Required', value: `${requiredMappedCount} / ${requiredTotalCount}` },
        { label: 'Unmapped Required', value: `${state.mapping.unmappedTargetFields.length}` },
      ],
    },
    {
      key: 'validation',
      cardKey: 'validation',
      nodeKey: 'validation',
      title: 'Validation',
      step: 'validation',
      status: validationStatus(state),
      rows: [
        { label: 'Rules', value: `${state.validation.rules.length}` },
        { label: 'Blocking', value: `${state.validation.rules.filter((r) => r.enabled && r.severity === 'Error').length}` },
        { label: 'Auto', value: `${state.validation.rules.filter((r) => r.source === 'auto').length}` },
        { label: 'Mode', value: state.validation.policyMode },
      ],
    },
    {
      key: 'target-primary',
      cardKey: 'target',
      nodeKey: 'targetGroup',
      title: 'Target',
      step: 'targetGroup',
      status: targetStatus(state),
      statusLabel: stw === 'block' ? 'Identical source/target' : stw === 'warn' ? 'Same connection' : undefined,
      rows: [
        { label: 'Primary', value: primaryTarget?.connectionName || 'Not selected' },
        { label: 'Pattern', value: state.targetGroup.deliveryPattern },
        {
          label: 'Profile',
          value: state.targetGroup.targetProfileState
            ? PROFILE_STATUS_LABELS[state.targetGroup.targetProfileState.status]
            : 'None',
        },
      ],
    },
    ...additionalTargetCards,
    {
      key: 'response',
      cardKey: 'response',
      nodeKey: 'responseHandling',
      title: 'Response',
      step: 'responseHandling',
      status: responseStatus(state),
      rows: [
        { label: 'Success', value: state.responseHandling.successPolicy },
        { label: 'Errors', value: state.responseHandling.errorPolicy },
        { label: 'Callback', value: state.responseHandling.callbackEnabled ? 'Configured' : 'Off' },
        { label: 'Business Map', value: state.responseHandling.businessResponseMappingEnabled ? 'Yes' : 'No' },
      ],
    },
    {
      key: 'operations',
      cardKey: 'operations',
      nodeKey: 'operations',
      title: 'Monitoring & Ops',
      step: 'operations',
      status: operationsStatus(state),
      rows: [
        { label: 'Retry', value: state.operations.enableRetry ? `${state.operations.maxRetries}x` : 'Off' },
        { label: 'Alerts', value: state.operations.alertChannel },
        { label: 'DLQ', value: state.operations.deadLetterEnabled ? 'Enabled' : 'Off' },
        { label: 'Diag', value: state.operations.diagnosticsLevel },
      ],
    },
  ];
  const selectedCardIndex = cards.findIndex((card) => card.step === activeStep);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-storyboard-card="true"]')) return;
    if (!scrollContainerRef.current) return;

    draggingRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: scrollContainerRef.current.scrollLeft,
      startScrollTop: scrollContainerRef.current.scrollTop,
    };
    scrollContainerRef.current.style.cursor = 'grabbing';
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current.active || !scrollContainerRef.current) return;
    const dx = event.clientX - draggingRef.current.startX;
    const dy = event.clientY - draggingRef.current.startY;
    scrollContainerRef.current.scrollLeft = draggingRef.current.startScrollLeft - dx;
    scrollContainerRef.current.scrollTop = draggingRef.current.startScrollTop - dy;
  };

  const handlePointerUp = () => {
    draggingRef.current.active = false;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grab';
    }
  };

  // Auto-center selected card only on first mount (not on every click / zoom).
  const hasInitScrolled = useRef(false);
  useEffect(() => {
    if (hasInitScrolled.current) return;
    if (selectedCardRef.current && scrollContainerRef.current) {
      hasInitScrolled.current = true;
      const container = scrollContainerRef.current;
      const card = selectedCardRef.current;
      const scale = zoomPct / 100;

      const cardTop = card.offsetTop * scale;
      const cardLeft = card.offsetLeft * scale;
      const cardHeight = card.offsetHeight * scale;
      const cardWidth = card.offsetWidth * scale;
      const containerHeight = container.clientHeight;
      const containerWidth = container.clientWidth;

      const scrollLeft = cardLeft - (containerWidth - cardWidth) / 2;
      const scrollTop = cardTop - (containerHeight - cardHeight) / 2;

      container.scrollTo({
        left: Math.max(0, scrollLeft),
        top: Math.max(0, scrollTop),
        behavior: 'smooth',
      });
    }
  }, [activeStep, zoomPct]);

  const brandPattern = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 9.6L14.4 12L12 14.4L9.6 12L12 9.6ZM10.85 11.7H13.15L12 10.55L10.85 11.7Z' fill='rgba(100,116,139,0.2)'/%3E%3C/svg%3E")`;

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-xl border border-border-soft/70"
      style={{ backgroundImage: brandPattern, backgroundSize: '28px 28px', backgroundPosition: '0 0' }}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-100/30 via-transparent to-slate-200/30" />

      <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full border border-white/40 bg-white/60 px-2 py-1 shadow-[0_8px_24px_-14px_rgba(15,23,42,0.5)] backdrop-blur-md">
        <button
          type="button"
          onClick={() => setZoomPct((prev) => Math.max(50, prev - 10))}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-text-muted transition hover:bg-slate-100 hover:text-text-main"
          aria-label="Zoom out"
        >
          <span className="material-symbols-outlined text-[16px]">remove</span>
        </button>
        <button
          type="button"
          onClick={() => setZoomPct(100)}
          className="rounded-full border border-border-soft bg-white px-2 py-0.5 text-[11px] font-semibold text-text-main"
        >
          {zoomPct}%
        </button>
        <button
          type="button"
          onClick={() => setZoomPct((prev) => Math.min(180, prev + 10))}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-text-muted transition hover:bg-slate-100 hover:text-text-main"
          aria-label="Zoom in"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
        </button>
      </div>

      <div
        ref={scrollContainerRef}
        className="relative h-full w-full overflow-auto"
        style={{ cursor: 'grab' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div className="flex min-h-full min-w-full justify-center px-8 py-10">
          <div style={{ transform: `scale(${zoomPct / 100})`, transformOrigin: 'top center' }} className="transition-transform duration-150">
            {/* Offset left by half the VE sidecar width (8+48+180)/2 ≈ 118px to optically center the combined flow */}
            <div className="flex flex-col items-center" style={{ marginLeft: '-118px' }}>
              {(() => {
                const validationIdx = cards.findIndex((c) => c.key === 'validation');
                const responseIdx = cards.findIndex((c) => c.key === 'response');
                /* Count vertical cards between validation and response (exclusive) to size the side connector */
                const betweenCards = (validationIdx >= 0 && responseIdx > validationIdx) ? responseIdx - validationIdx - 1 : 1;
                /* Vertical drop from VE card bottom to Response card mid-height */
                const sideDropH = betweenCards * (184 + 40) + 40 + 96;
                /* Horizontal distance from VE card centre back to main column right edge */
                const sideTurnX = 143;

                return cards.map((card, index) => {
                  const isValidation = card.key === 'validation';
                  const isResponse = card.key === 'response';
                  const errorRuleCount = state.validation.rules.filter((r) => r.enabled && r.severity === 'Error').length;

                  return (
                    <div key={card.key} className="flex flex-col items-center">
                      {/* Wrapper: relative so Validation Error can be absolutely positioned */}
                      <div className={isValidation ? 'relative' : ''}>
                        <div ref={index === selectedCardIndex ? selectedCardRef : null}>
                          <StoryboardCard
                            cardKey={card.cardKey}
                            icon={getWorkflowNodeIconByKey(card.nodeKey)}
                            title={card.title}
                            selected={isValidation ? activeStep === 'validation' && validationTab !== 'error-handler' : card.step === activeStep}
                            status={card.status}
                            statusLabel={card.statusLabel}
                            onClick={() => { onSelectStep(card.step); if (isValidation) onValidationTabChange?.('rules'); }}
                          >
                            {card.rows.map((row) => (
                              <CardRow key={`${card.key}-${row.label}`} label={row.label} value={row.value} mono={row.mono} />
                            ))}
                          </StoryboardCard>
                        </div>

                        {/* Validation Error node: absolutely positioned to the right */}
                        {isValidation && (
                          <div className="absolute left-full top-0 flex items-start" style={{ marginLeft: '8px' }}>
                            {/* Fail connector arrow */}
                            <div className="flex items-center self-center">
                              <svg width="48" height="20" viewBox="0 0 48 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                                <line x1="0" y1="10" x2="36" y2="10" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 2" />
                                <path d="M34 6L40 10L34 14" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                <text x="20" y="7" fontSize="8" fill="#ef4444" fontWeight="600" textAnchor="middle">Fail</text>
                              </svg>
                            </div>

                            {/* Validation Error card */}
                            <div className="relative">
                              <button
                                type="button"
                                data-storyboard-card="true"
                                onClick={() => { onSelectStep('validation'); onValidationTabChange?.('error-handler'); }}
                                className={`group relative flex h-[184px] w-[180px] flex-none flex-col rounded-xl border text-left transition-all duration-200 ${
                                  activeStep === 'validation' && validationTab === 'error-handler'
                                    ? 'border-danger/40 bg-surface shadow-[0_0_0_1px_rgba(239,68,68,0.1),0_4px_16px_-2px_rgba(239,68,68,0.12)] ring-1 ring-danger/20'
                                    : 'border-danger/20 bg-surface shadow-soft hover:border-danger/40 hover:shadow-md'
                                }`}
                              >
                                <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-danger-bg text-danger-text">
                                    <WorkflowNodeIcon kind={getWorkflowNodeIconByKey('errorHandling')} size={16} className="text-current" accentColor="#ef4444" />
                                  </div>
                                  <p className="text-[12px] font-semibold text-danger-text truncate">Validation Error</p>
                                </div>
                                <div className="flex-1 px-3 py-1 space-y-0.5 overflow-hidden">
                                  <CardRow label="Log" value={state.validation.errorConfig?.logEnabled ? 'Enabled' : 'Off'} />
                                  <CardRow label="DLQ" value={state.validation.errorConfig?.dlqEnabled ? 'Enabled' : 'Off'} />
                                  <CardRow label="Notify" value={state.validation.errorConfig?.notifyChannel === 'None' ? 'Off' : (state.validation.errorConfig?.notifyChannel ?? 'Off')} />
                                  <CardRow label="Policy" value={state.validation.policyMode} />
                                </div>
                                <div className="flex items-center gap-1.5 border-t border-danger/10 px-3 py-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-danger" />
                                  <span className="text-[9px] font-semibold text-danger-text">Fail Path</span>
                                </div>
                              </button>

                              {/* L-shaped red connector: down from VE card, then left to Response right edge */}
                              <svg
                                width={sideTurnX + 20}
                                height={sideDropH + 4}
                                viewBox={`0 0 ${sideTurnX + 20} ${sideDropH + 4}`}
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className="absolute pointer-events-none"
                                style={{ top: '100%', left: '50%', marginLeft: -(sideTurnX + 10) }}
                              >
                                {/* Vertical segment from VE centre down */}
                                <line x1={sideTurnX + 10} y1="0" x2={sideTurnX + 10} y2={sideDropH - 4} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 2" />
                                {/* Horizontal segment turning left */}
                                <line x1={sideTurnX + 10} y1={sideDropH - 4} x2="12" y2={sideDropH - 4} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 2" />
                                {/* Left-pointing arrowhead */}
                                <path d={`M14 ${sideDropH - 8}L8 ${sideDropH - 4}L14 ${sideDropH}`} stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                              </svg>
                            </div>
                          </div>
                        )}

                      </div>

                      {/* Connector with Pass label beside the arrow (after validation) */}
                      {isValidation && index < cards.length - 1 && (
                        <div className="relative">
                          <StoryboardConnector orientation="vertical" />
                          <span className="absolute left-full top-1/2 -translate-y-1/2 ml-1.5 text-[8px] font-semibold text-emerald-500 tracking-wide whitespace-nowrap">Pass</span>
                        </div>
                      )}

                      {/* Regular connector for non-validation cards */}
                      {!isValidation && index < cards.length - 1 ? <StoryboardConnector orientation="vertical" /> : null}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
