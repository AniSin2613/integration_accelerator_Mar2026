'use client';

import { useState, type ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/*  Shared CSS tokens (gold-standard styling)                          */
/* ------------------------------------------------------------------ */

const INPUT_BASE =
  'h-10 w-full rounded-lg border border-border-soft bg-background-light px-3 text-sm text-text-main placeholder:text-text-muted/70 transition-colors focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-text-muted';

const SELECT_BASE =
  'h-10 w-full cursor-pointer appearance-none rounded-lg border border-border-soft bg-background-light pl-3 pr-8 text-sm text-text-main transition-colors focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-text-muted';

/* ------------------------------------------------------------------ */
/*  FormLabel                                                          */
/* ------------------------------------------------------------------ */

function FormLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
      {children}
      {required && <span className="ml-0.5 text-danger">*</span>}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  TextField                                                          */
/* ------------------------------------------------------------------ */

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <FormLabel required={required}>{label}</FormLabel>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`mt-1 ${INPUT_BASE}`}
      />
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  NumberField                                                        */
/* ------------------------------------------------------------------ */

export function NumberField({
  label,
  value,
  onChange,
  required,
  disabled,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  required?: boolean;
  disabled?: boolean;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block">
      <FormLabel required={required}>{label}</FormLabel>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        className={`mt-1 ${INPUT_BASE}`}
      />
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  SelectField                                                        */
/* ------------------------------------------------------------------ */

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  required,
  disabled,
}: {
  label: string;
  value: T;
  options: readonly T[] | T[];
  onChange: (value: T) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="relative block">
      <FormLabel required={required}>{label}</FormLabel>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        required={required}
        disabled={disabled}
        className={`mt-1 ${SELECT_BASE}`}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span className="material-symbols-outlined pointer-events-none absolute bottom-2.5 right-2.5 text-[16px] text-text-muted">
        expand_more
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  SecretField (password with show/hide toggle)                       */
/* ------------------------------------------------------------------ */

export function SecretField({
  label,
  value,
  onChange,
  placeholder,
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block">
      <FormLabel required={required}>{label}</FormLabel>
      <div className="relative mt-1">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`${INPUT_BASE} pr-10`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted hover:text-text-main"
          tabIndex={-1}
        >
          <span className="material-symbols-outlined text-[18px]">
            {visible ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      </div>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  CheckboxField                                                      */
/* ------------------------------------------------------------------ */

export function CheckboxField({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 rounded border-border-soft text-primary accent-primary focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <span className="text-sm text-text-main">{label}</span>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  TextAreaField                                                      */
/* ------------------------------------------------------------------ */

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  disabled,
  id,
  hint,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  id?: string;
  hint?: string;
}) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-[13px] font-semibold text-text-main">
          {label}
          {hint && <span className="ml-1 font-normal text-text-muted">{hint}</span>}
        </label>
      )}
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        disabled={disabled}
        placeholder={placeholder}
        className={`${label ? 'mt-2' : ''} w-full resize-none rounded-lg border border-border-soft bg-background-light px-3.5 py-2.5 text-sm text-text-main placeholder:text-text-muted/50 transition-colors focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-text-muted`}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  InlineSelect – compact label-less select for use in tables, etc.   */
/* ------------------------------------------------------------------ */

export function InlineSelect<T extends string>({
  value,
  options,
  onChange,
  disabled,
  ariaLabel,
  id,
}: {
  value: T;
  options: readonly T[] | T[];
  onChange: (value: T) => void;
  disabled?: boolean;
  ariaLabel?: string;
  id?: string;
}) {
  return (
    <span className="relative inline-flex">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        disabled={disabled}
        aria-label={ariaLabel}
        className="h-8 cursor-pointer appearance-none rounded-md border border-border-soft bg-background-light pl-2 pr-7 text-xs text-text-main transition-colors focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-text-muted"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span className="material-symbols-outlined pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[14px] text-text-muted">
        expand_more
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  KeyValueListEditor – dynamic key-value pair list                   */
/* ------------------------------------------------------------------ */

const KV_INPUT_CLASSES =
  'h-9 flex-1 rounded-lg border border-border-soft bg-background-light px-3 text-sm text-text-main placeholder:text-text-muted/70 transition-colors focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-text-muted';

export function KeyValueListEditor({
  label,
  entries,
  onChange,
  disabled,
}: {
  label: string;
  entries: Array<{ key: string; value: string }>;
  onChange: (entries: Array<{ key: string; value: string }>) => void;
  disabled?: boolean;
}) {
  const update = (index: number, field: 'key' | 'value', val: string) => {
    const next = entries.map((e, i) => (i === index ? { ...e, [field]: val } : e));
    onChange(next);
  };
  const add = () => onChange([...entries, { key: '', value: '' }]);
  const remove = (index: number) => onChange(entries.filter((_, i) => i !== index));

  return (
    <div>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{label}</span>
      <div className="mt-1 space-y-2">
        {entries.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={entry.key}
              onChange={(e) => update(i, 'key', e.target.value)}
              placeholder="Parameter name"
              disabled={disabled}
              className={KV_INPUT_CLASSES}
            />
            <input
              type="text"
              value={entry.value}
              onChange={(e) => update(i, 'value', e.target.value)}
              placeholder="Value"
              disabled={disabled}
              className={KV_INPUT_CLASSES}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={disabled}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-soft text-text-muted hover:bg-slate-50 hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Remove parameter"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={add}
          disabled={disabled}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-dashed border-border-soft px-3 text-xs font-medium text-text-muted hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
          Add parameter
        </button>
      </div>
    </div>
  );
}
