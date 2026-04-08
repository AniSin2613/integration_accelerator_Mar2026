'use client';

import { useCallback, useState } from 'react';
import { api } from '@/lib/api-client';
import { FamilySpecificEditor, SelectField, TextField } from './ConnectionFormFields';
import {
  type ConnectionConfig,
  type ConnectionFamily,
  CONNECTION_FAMILY_FILTER_OPTIONS,
  FAMILY_TO_ENUM,
  createDefaultConfig,
} from './types';

const FAMILY_OPTIONS = CONNECTION_FAMILY_FILTER_OPTIONS.filter((o) => o !== 'All Types') as unknown as ConnectionFamily[];

interface CreateConnectionModalProps {
  workspaceSlug: string;
  onCreated: () => void;
  onClose: () => void;
}

function normalizeConfigForSubmit(config: ConnectionConfig, platformLabel?: string): ConnectionConfig {
  const normalized = { ...config, platformLabel: platformLabel?.trim() || undefined } as ConnectionConfig;

  // Backend requires API key placement when API Key auth is selected.
  if (normalized.family === 'REST / OpenAPI outbound' && normalized.authMethod === 'API Key') {
    normalized.apiKeyPlacement = normalized.apiKeyPlacement ?? 'Header';
  }

  return normalized;
}

export function CreateConnectionModal({ workspaceSlug, onCreated, onClose }: CreateConnectionModalProps) {
  const [name, setName] = useState('');
  const [family, setFamily] = useState<ConnectionFamily>('REST / OpenAPI outbound');
  const [platformLabel, setPlatformLabel] = useState('');
  const [config, setConfig] = useState<ConnectionConfig>(createDefaultConfig('REST / OpenAPI outbound'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateFamily = useCallback((next: ConnectionFamily) => {
    setFamily(next);
    setConfig(createDefaultConfig(next));
  }, []);

  const updateConfig = useCallback((updates: Partial<ConnectionConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates } as ConnectionConfig));
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Connection name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const normalizedConfig = normalizeConfigForSubmit(config, platformLabel);
      await api.post('/connections', {
        name: name.trim(),
        family: FAMILY_TO_ENUM[family],
        platformLabel: platformLabel.trim() || undefined,
        workspaceSlug,
        config: normalizedConfig,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create connection.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* backdrop */}
      <div className="fixed inset-0 z-50 bg-slate-900/40" onClick={onClose} />

      {/* centered modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-[640px] max-h-[85vh] flex flex-col rounded-2xl border border-border-soft bg-surface shadow-floating"
          role="dialog"
          aria-modal="true"
          aria-label="Create Connection"
          onClick={(e) => e.stopPropagation()}
        >
          {/* header */}
          <header className="flex items-center justify-between border-b border-border-soft px-6 py-4">
            <h2 className="text-lg font-semibold text-text-main">Create Connection</h2>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-soft text-text-muted hover:bg-slate-50"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </header>

          {/* scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* core details */}
            <section className="rounded-lg border border-border-soft bg-background-light p-4">
              <p className="text-sm font-semibold text-text-main">Connection Details</p>
              <div className="mt-3 grid grid-cols-1 gap-3">
                <TextField
                  label="Connection Name"
                  value={name}
                  onChange={setName}
                  placeholder="e.g. Coupa Source API"
                  required
                />
                <SelectField
                  label="Family / Type"
                  value={family}
                  options={FAMILY_OPTIONS}
                  onChange={updateFamily}
                  required
                />
                <TextField
                  label="Platform Label (optional)"
                  value={platformLabel}
                  onChange={setPlatformLabel}
                  placeholder="Coupa, SAP, Dynamics…"
                />
              </div>
            </section>

            {/* family-specific config */}
            <FamilySpecificEditor config={config} onChange={updateConfig} />

            {/* error banner */}
            {error && (
              <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}
          </div>

          {/* footer */}
          <footer className="flex items-center justify-end gap-2 border-t border-border-soft px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border-soft bg-surface px-3.5 text-sm font-semibold text-text-main hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create Connection'}
            </button>
          </footer>
        </div>
      </div>
    </>
  );
}
