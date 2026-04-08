export type WorkflowNodeIconKind =
  | 'trigger'
  | 'source'
  | 'mapping'
  | 'transform'
  | 'validation'
  | 'target'
  | 'delivery'
  | 'error'
  | 'response'
  | 'monitoring';

export type WorkflowNodeKey =
  | 'trigger'
  | 'source'
  | 'sourceGroup'
  | 'mapping'
  | 'transformations'
  | 'validation'
  | 'rules'
  | 'target'
  | 'targetGroup'
  | 'delivery'
  | 'response'
  | 'responseHandling'
  | 'error'
  | 'errorHandling'
  | 'monitoring'
  | 'operations';

const NODE_ICON_BY_KEY: Record<WorkflowNodeKey, WorkflowNodeIconKind> = {
  trigger: 'trigger',
  source: 'source',
  sourceGroup: 'source',
  mapping: 'mapping',
  transformations: 'transform',
  validation: 'validation',
  rules: 'validation',
  target: 'target',
  targetGroup: 'target',
  delivery: 'delivery',
  response: 'response',
  responseHandling: 'response',
  error: 'error',
  errorHandling: 'error',
  monitoring: 'monitoring',
  operations: 'monitoring',
};

export function getWorkflowNodeIconByKey(key: WorkflowNodeKey): WorkflowNodeIconKind {
  return NODE_ICON_BY_KEY[key];
}
