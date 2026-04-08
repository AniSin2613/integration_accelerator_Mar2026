import { type WorkflowNodeIconKind } from '@/lib/workflow-node-icons';

interface WorkflowNodeIconProps {
  kind: WorkflowNodeIconKind;
  size?: number;
  className?: string;
  accentColor?: string;
}

export function WorkflowNodeIcon({ kind, size = 18, className, accentColor = '#BF2D42' }: WorkflowNodeIconProps) {
  const base = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  };

  switch (kind) {
    case 'trigger':
      return (
        <svg {...base} aria-hidden>
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          <circle cx="13" cy="2" r="1.5" fill={accentColor} stroke="none" />
        </svg>
      );
    case 'source':
      return (
        <svg {...base} aria-hidden>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" stroke={accentColor} />
          <line x1="12" y1="3" x2="12" y2="15" stroke={accentColor} />
        </svg>
      );
    case 'mapping':
      return (
        <svg {...base} aria-hidden>
          <path d="M4 6h6M14 6h6M4 12h6M14 12h6M4 18h6M14 18h6" />
          <path d="M10 6l4 12" stroke={accentColor} strokeDasharray="2 2" />
        </svg>
      );
    case 'transform':
      return (
        <svg {...base} aria-hidden>
          <path d="M8 3v3a2 2 0 0 1-2 2H3" />
          <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
          <path d="M3 16h3a2 2 0 0 1 2 2v3" />
          <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
          <circle cx="12" cy="12" r="3" stroke={accentColor} />
        </svg>
      );
    case 'validation':
      return (
        <svg {...base} aria-hidden>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M9 15l2 2 4-4" stroke={accentColor} />
        </svg>
      );
    case 'target':
      return (
        <svg {...base} aria-hidden>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" stroke={accentColor} />
          <line x1="12" y1="3" x2="12" y2="15" stroke={accentColor} />
        </svg>
      );
    case 'delivery':
      return (
        <svg {...base} aria-hidden>
          <path d="M22 2L11 13" />
          <path d="M22 2l-7 20-4-9-9-4 20-7z" />
          <path d="M22 2" stroke={accentColor} strokeWidth={3} />
        </svg>
      );
    case 'error':
      return (
        <svg {...base} aria-hidden>
          <circle cx="12" cy="12" r="10" stroke={accentColor} />
          <line x1="12" y1="8" x2="12" y2="12" stroke={accentColor} />
          <line x1="12" y1="16" x2="12.01" y2="16" stroke={accentColor} />
        </svg>
      );
    case 'response':
      return (
        <svg {...base} aria-hidden>
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          <circle cx="12" cy="12" r="1" fill={accentColor} stroke="none" />
        </svg>
      );
    case 'monitoring':
      return (
        <svg {...base} aria-hidden>
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          <circle cx="12" cy="12" r="2" fill={accentColor} stroke="none" />
        </svg>
      );
    default:
      return null;
  }
}
