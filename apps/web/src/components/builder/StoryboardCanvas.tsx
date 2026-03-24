'use client';

import { useEffect, useRef } from 'react';
import { StoryboardCard, CardRow } from '@/components/ui/StoryboardCard';
import { StoryboardConnector } from '@/components/ui/StoryboardConnector';
import type { CardStatus } from '@/components/ui/StoryboardCard';
import {
  type BuilderState,
  type BuilderStepId,
  isTriggerComplete,
  isSourceComplete,
  isMappingComplete,
  isValidationComplete,
  isTargetComplete,
  isResponseHandlingComplete,
  isMonitoringComplete,
  getSourceTargetWarning,
} from './types';

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
}

export function StoryboardCanvas({ state, activeStep, onSelectStep }: StoryboardCanvasProps) {
  const stw = getSourceTargetWarning(state);
  const primaryTarget = state.targetGroup.targets[0];
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedCardRef = useRef<HTMLDivElement>(null);

  // Auto-center selected card when it changes
  useEffect(() => {
    if (selectedCardRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const card = selectedCardRef.current;
      
      // Calculate scroll position to center the card
      const cardLeft = card.offsetLeft;
      const cardWidth = card.offsetWidth;
      const containerWidth = container.clientWidth;
      const scrollLeft = cardLeft - (containerWidth - cardWidth) / 2;
      
      // Smooth scroll to center
      container.scrollTo({
        left: Math.max(0, scrollLeft),
        behavior: 'smooth'
      });
    }
  }, [activeStep]);

  return (
    <div
      ref={scrollContainerRef}
      className="flex h-full w-full items-center overflow-x-auto overflow-y-hidden"
    >
      <div className="mx-auto inline-flex min-w-max items-center px-3 py-2">
        <div ref={activeStep === 'trigger' ? selectedCardRef : null}>
          <StoryboardCard cardKey="trigger" icon="bolt" title="Trigger" selected={activeStep === 'trigger'} status={triggerStatus(state)} onClick={() => onSelectStep('trigger')}>
            <CardRow label="Type" value={state.trigger.triggerType} />
            {state.trigger.triggerType === 'Schedule / Cron' && state.trigger.cronExpression && <CardRow label="Cron" value={state.trigger.cronExpression} mono />}
            <CardRow label="Timezone" value={state.trigger.timezone} />
          </StoryboardCard>
        </div>

        <StoryboardConnector />

        <div ref={activeStep === 'sourceGroup' ? selectedCardRef : null}>
          <StoryboardCard cardKey="source" icon="cloud_download" title="Source" selected={activeStep === 'sourceGroup'} status={sourceStatus(state)} onClick={() => onSelectStep('sourceGroup')}>
            <CardRow label="Primary" value={state.sourceGroup.primary.connectionName || 'Not selected'} />
            <CardRow label="Interface" value={state.sourceGroup.primary.businessObject || 'Not set'} />
            <CardRow label="Enrichment" value={`${state.sourceGroup.enrichmentSources.length}`} />
            <CardRow label="Pattern" value={state.sourceGroup.processingPattern} />
          </StoryboardCard>
        </div>

        <StoryboardConnector />

        <div ref={activeStep === 'mapping' ? selectedCardRef : null}>
          <StoryboardCard cardKey="mapping" icon="schema" title="Mapping" selected={activeStep === 'mapping'} status={mappingStatus(state)} onClick={() => onSelectStep('mapping')}>
            <CardRow label="Mapped" value={`${state.mapping.mappings.length}`} />
            <CardRow label="Required" value={`${state.mapping.mappings.filter((m) => m.required).length}`} />
            <CardRow label="Unmapped Src" value={`${state.mapping.unmappedSourceFields.length}`} />
            <CardRow label="Unmapped Canonical" value={`${state.mapping.unmappedTargetFields.length}`} />
          </StoryboardCard>
        </div>

        <StoryboardConnector />

        <div ref={activeStep === 'validation' ? selectedCardRef : null}>
          <StoryboardCard cardKey="validation" icon="rule" title="Validation" selected={activeStep === 'validation'} status={validationStatus(state)} onClick={() => onSelectStep('validation')}>
            <CardRow label="Rules" value={`${state.validation.rules.length}`} />
            <CardRow label="Blocking" value={`${state.validation.rules.filter((r) => r.enabled && r.severity === 'Error').length}`} />
            <CardRow label="Warnings" value={`${state.validation.rules.filter((r) => r.enabled && r.severity === 'Warning').length}`} />
            <CardRow label="Mode" value={state.validation.policyMode} />
          </StoryboardCard>
        </div>

        <StoryboardConnector />

        <div ref={activeStep === 'targetGroup' ? selectedCardRef : null}>
          <StoryboardCard cardKey="target" icon="cloud_upload" title="Target" selected={activeStep === 'targetGroup'} status={targetStatus(state)} statusLabel={stw === 'block' ? 'Identical source/target' : stw === 'warn' ? 'Same connection' : undefined} onClick={() => onSelectStep('targetGroup')}>
            <CardRow label="Primary" value={primaryTarget?.connectionName || 'Not selected'} />
            <CardRow label="Additional" value={`${Math.max(0, state.targetGroup.targets.length - 1)}`} />
            <CardRow label="Pattern" value={state.targetGroup.deliveryPattern} />
          </StoryboardCard>
        </div>

        <StoryboardConnector />

        <div ref={activeStep === 'responseHandling' ? selectedCardRef : null}>
          <StoryboardCard cardKey="response" icon="reply" title="Response" selected={activeStep === 'responseHandling'} status={responseStatus(state)} onClick={() => onSelectStep('responseHandling')}>
            <CardRow label="Success" value={state.responseHandling.successPolicy} />
            <CardRow label="Errors" value={state.responseHandling.errorPolicy} />
            <CardRow label="Callback" value={state.responseHandling.callbackEnabled ? 'Configured' : 'Off'} />
            <CardRow label="Business Map" value={state.responseHandling.businessResponseMappingEnabled ? 'Yes' : 'No'} />
          </StoryboardCard>
        </div>

        <StoryboardConnector />

        <div ref={activeStep === 'operations' ? selectedCardRef : null}>
          <StoryboardCard cardKey="operations" icon="monitoring" title="Monitoring & Ops" selected={activeStep === 'operations'} status={operationsStatus(state)} onClick={() => onSelectStep('operations')}>
            <CardRow label="Retry" value={state.operations.enableRetry ? `${state.operations.maxRetries}x` : 'Off'} />
            <CardRow label="Alerts" value={state.operations.alertChannel} />
            <CardRow label="DLQ" value={state.operations.deadLetterEnabled ? 'Enabled' : 'Off'} />
            <CardRow label="Diag" value={state.operations.diagnosticsLevel} />
          </StoryboardCard>
        </div>
      </div>
    </div>
  );
}
