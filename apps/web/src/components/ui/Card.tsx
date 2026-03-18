import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-surface rounded-xl border border-border-soft shadow-soft ${className}`}>
      {children}
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  icon?: string;
  iconColor?: string;
  sub?: string;
}

export function KpiCard({ label, value, trend, trendUp, icon, iconColor = 'text-primary', sub }: KpiCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-text-muted text-sm font-medium">{label}</p>
        {icon && (
          <div className={`w-8 h-8 rounded-full bg-current/10 flex items-center justify-center ${iconColor}`}>
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-text-main tabular-nums">{value}</span>
        {trend && (
          <span className={`text-sm font-medium flex items-center gap-0.5 ${trendUp ? 'text-success' : 'text-danger'}`}>
            <span className="material-symbols-outlined text-[14px]">{trendUp ? 'arrow_upward' : 'arrow_downward'}</span>
            {trend}
          </span>
        )}
      </div>
      {sub && <p className="text-text-muted text-xs mt-2">{sub}</p>}
    </Card>
  );
}
