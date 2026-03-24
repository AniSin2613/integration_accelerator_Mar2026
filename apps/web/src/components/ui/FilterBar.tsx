import { type ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/*  FilterBarSection – outer wrapper                                   */
/* ------------------------------------------------------------------ */

interface FilterBarSectionProps {
  children: ReactNode;
  /** Hint text shown below filters when they are disabled. */
  disabledHint?: string;
  disabled?: boolean;
}

export function FilterBarSection({ children, disabled, disabledHint }: FilterBarSectionProps) {
  return (
    <section className="rounded-xl border border-border-soft bg-surface p-4 shadow-soft sm:p-5">
      {children}
      {disabled && disabledHint ? (
        <p className="mt-3 text-[12px] text-text-muted/60">{disabledHint}</p>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  FilterBarSearch – search input with icon                           */
/* ------------------------------------------------------------------ */

interface FilterBarSearchProps {
  value: string;
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

const INPUT_CLASSES =
  'h-10 w-full rounded-lg border border-border-soft bg-background-light pl-9 pr-3 text-sm text-text-main placeholder:text-text-muted/70 transition-colors focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-text-muted';

export function FilterBarSearch({ value, placeholder, disabled, onChange }: FilterBarSearchProps) {
  return (
    <label className="relative block">
      <span className="sr-only">{placeholder}</span>
      <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-text-muted">
        search
      </span>
      <input
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={INPUT_CLASSES}
      />
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  FilterBarSelect – custom-styled select with chevron icon           */
/* ------------------------------------------------------------------ */

interface FilterBarSelectProps<T extends string> {
  value: T;
  options: readonly T[] | T[];
  ariaLabel: string;
  disabled?: boolean;
  onChange: (value: T) => void;
}

const SELECT_CLASSES =
  'h-10 w-full cursor-pointer appearance-none rounded-lg border border-border-soft bg-background-light pl-3 pr-8 text-sm text-text-main transition-colors focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-text-muted';

export function FilterBarSelect<T extends string>({
  value,
  options,
  ariaLabel,
  disabled,
  onChange,
}: FilterBarSelectProps<T>) {
  return (
    <label className="relative block">
      <span className="sr-only">{ariaLabel}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as T)}
        aria-label={ariaLabel}
        className={SELECT_CLASSES}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[16px] text-text-muted">
        expand_more
      </span>
    </label>
  );
}
