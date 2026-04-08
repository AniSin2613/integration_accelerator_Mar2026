'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { TextField } from '@/components/ui/FormFields';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface TargetProfileSummary {
  id: string;
  name: string;
  system: string;
  object: string;
  isPublished: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  schemaPack: { id: string; name: string; system: string; object: string; version: string };
  _count: { fields: number; overlays: number };
}

interface SchemaPackOption {
  id: string;
  name: string;
  system: string;
  object: string;
  version: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function TargetProfilesListPage() {
  const [profiles, setProfiles] = useState<TargetProfileSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<TargetProfileSummary[]>('/target-profiles');
      setProfiles(data);
    } catch (err) {
      console.error('Failed to load target profiles', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <section className="rounded-xl border border-border-soft bg-surface p-4 shadow-soft sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-[18px] font-semibold text-text-main">Target Profiles</h2>
          <p className="mt-1 text-sm text-text-muted">
            Curated target-system schemas with business-friendly naming, validation, and overlay rules.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs font-medium text-text-muted">{profiles.length} profiles</p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/[0.06] px-3.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/[0.12]"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Profile
          </button>
        </div>
      </div>

      {showCreate && (
        <CreateProfilePanel
          onCreated={() => { setShowCreate(false); load(); }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <div className="mt-4 overflow-x-auto rounded-lg border border-border-soft">
        <table className="min-w-[840px] w-full border-collapse text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-muted">Profile</th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-muted">System / Object</th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-muted">Schema Pack</th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-muted">Fields</th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-muted">Overlays</th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-muted">Status</th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-muted" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-text-muted">Loading…</td></tr>
            )}
            {!loading && profiles.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-text-muted">No target profiles yet. Create one to get started.</td></tr>
            )}
            {profiles.map((p) => (
              <tr key={p.id} className="border-t border-border-soft align-middle">
                <td className="px-3 py-3">
                  <Link href={`/platform-admin/target-profiles/${p.id}`} className="text-sm font-semibold text-primary hover:underline">
                    {p.name}
                  </Link>
                  {p.description && <p className="mt-0.5 text-xs text-text-muted line-clamp-1">{p.description}</p>}
                </td>
                <td className="px-3 py-3 text-sm text-text-main">{p.system} / {p.object}</td>
                <td className="px-3 py-3">
                  <span className="text-xs text-text-muted">{p.schemaPack.name}</span>
                  <span className="ml-1 text-[10px] text-text-muted/60">v{p.schemaPack.version}</span>
                </td>
                <td className="px-3 py-3 text-sm text-text-main tabular-nums">{p._count.fields}</td>
                <td className="px-3 py-3 text-sm text-text-main tabular-nums">{p._count.overlays}</td>
                <td className="px-3 py-3">
                  <StatusBadge published={p.isPublished} />
                </td>
                <td className="px-3 py-3">
                  <Link
                    href={`/platform-admin/target-profiles/${p.id}`}
                    className="inline-flex h-8 items-center justify-center rounded-md border border-border-soft px-2.5 text-xs font-medium text-text-muted transition-colors hover:bg-slate-50 hover:text-text-main"
                  >
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  StatusBadge                                                        */
/* ------------------------------------------------------------------ */
function StatusBadge({ published }: { published: boolean }) {
  return published ? (
    <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
      Published
    </span>
  ) : (
    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
      Draft
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  CreateProfilePanel                                                 */
/* ------------------------------------------------------------------ */
function CreateProfilePanel({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [system, setSystem] = useState('');
  const [object, setObject] = useState('');
  const [description, setDescription] = useState('');
  const [schemaPackId, setSchemaPackId] = useState('');
  const [schemaPacks, setSchemaPacks] = useState<SchemaPackOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load available schema packs to populate the dropdown
    api.get<SchemaPackOption[]>('/schema-packs').then(setSchemaPacks).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schemaPackId || !name || !system || !object) return;

    try {
      setSaving(true);
      setError(null);
      await api.post('/target-profiles', { schemaPackId, name, system, object, description: description || undefined });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
    } finally {
      setSaving(false);
    }
  };

  // Auto-populate system/object when selecting a schema pack
  const handleSchemaPackChange = (id: string) => {
    setSchemaPackId(id);
    const pack = schemaPacks.find((p) => p.id === id);
    if (pack) {
      if (!system) setSystem(pack.system);
      if (!object) setObject(pack.object);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-lg border border-primary/20 bg-primary/[0.02] p-4 space-y-3">
      <p className="text-sm font-semibold text-text-main">Create Target Profile</p>

      {schemaPacks.length > 0 ? (
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Base Schema Pack</label>
          <select
            value={schemaPackId}
            onChange={(e) => handleSchemaPackChange(e.target.value)}
            required
            className="w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-text-main focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Select a schema pack…</option>
            {schemaPacks.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.system}/{p.object} v{p.version})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <TextField label="Schema Pack ID" value={schemaPackId} onChange={setSchemaPackId} required placeholder="Paste schema pack ID" />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TextField label="Profile Name" value={name} onChange={setName} required placeholder="e.g. SAP Invoice Target" />
        <TextField label="System" value={system} onChange={setSystem} required placeholder="e.g. SAP" />
        <TextField label="Object" value={object} onChange={setObject} required placeholder="e.g. Invoice" />
      </div>

      <TextField label="Description" value={description} onChange={setDescription} placeholder="Optional description" />

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={saving || !schemaPackId || !name || !system || !object}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Creating…' : 'Create Profile'}
        </button>
        <button type="button" onClick={onCancel} className="inline-flex h-9 items-center justify-center rounded-lg border border-border-soft px-4 text-sm font-medium text-text-muted transition-colors hover:bg-slate-50">
          Cancel
        </button>
      </div>
    </form>
  );
}
