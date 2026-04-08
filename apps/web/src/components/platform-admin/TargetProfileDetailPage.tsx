'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { TextField } from '@/components/ui/FormFields';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface ProfileField {
  id: string;
  path: string;
  dataType: string;
  required: boolean;
  businessName: string | null;
  description: string | null;
  validationRule: string | null;
  defaultValue: string | null;
  example: string | null;
  sortOrder: number;
}

interface Overlay {
  id: string;
  overlayType: string;
  config: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
}

interface ProfileVersion {
  id: string;
  version: string;
  publishedAt: string;
  snapshotJson?: VersionSnapshot;
}

interface VersionSnapshot {
  profileId: string;
  name: string;
  system: string;
  object: string;
  description: string | null;
  schemaPack: { id: string; name: string; system: string; object: string; version: string };
  fields: Array<{
    path: string;
    dataType: string;
    required: boolean;
    businessName: string | null;
    description: string | null;
    validationRule: string | null;
    defaultValue: string | null;
    example: string | null;
    sortOrder: number;
  }>;
  overlays: Array<{ overlayType: string; config: Record<string, unknown> }>;
}

interface DriftSuggestion {
  id: string;
  fieldPath: string;
  suggestionType: string;
  details: Record<string, unknown>;
  isApplied: boolean;
  createdAt: string;
}

interface EffectiveField {
  path: string;
  dataType: string;
  required: boolean;
  description: string | null;
  example: string | null;
  businessName: string | null;
  validationRule: string | null;
  defaultValue: string | null;
  visible: boolean;
  sortOrder: number;
  source: 'SCHEMA_PACK' | 'PROFILE';
}

interface EffectiveSchema {
  profileId: string;
  profileName: string;
  system: string;
  object: string;
  schemaPackId: string;
  schemaPackName: string;
  fieldCount: number;
  fields: EffectiveField[];
}

interface TargetProfile {
  id: string;
  name: string;
  system: string;
  object: string;
  description: string | null;
  isPublished: boolean;
  schemaPackId: string;
  schemaPack: { id: string; name: string; system: string; object: string; version: string; fields: { path: string; dataType: string }[] };
  fields: ProfileField[];
  overlays: Overlay[];
  currentVersion: ProfileVersion | null;
}

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */
const TABS = ['Fields', 'Overlays', 'Effective Schema', 'Versions', 'Drift', 'Settings'] as const;
type Tab = (typeof TABS)[number];

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export function TargetProfileDetailPage({ profileId }: { profileId: string }) {
  const [profile, setProfile] = useState<TargetProfile | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Fields');
  const [loading, setLoading] = useState(true);
  const [driftCounts, setDriftCounts] = useState<Record<string, number> | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<TargetProfile>(`/target-profiles/${profileId}`);
      setProfile(data);
    } catch (err) {
      console.error('Failed to load profile', err);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  const loadDriftCounts = useCallback(async () => {
    try {
      const counts = await api.get<Record<string, number>>(`/drift-review/counts/${profileId}`);
      setDriftCounts(counts);
    } catch {
      // Non-critical — fail silently
    }
  }, [profileId]);

  useEffect(() => { load(); loadDriftCounts(); }, [load, loadDriftCounts]);

  if (loading) {
    return <div className="rounded-xl border border-border-soft bg-surface p-8 text-center text-sm text-text-muted">Loading…</div>;
  }

  if (!profile) {
    return <div className="rounded-xl border border-border-soft bg-surface p-8 text-center text-sm text-danger">Profile not found</div>;
  }

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-border-soft bg-surface p-4 shadow-soft sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <Link href="/platform-admin/target-profiles" className="text-xs font-medium text-primary hover:underline">
              ← Back to Target Profiles
            </Link>
            <h2 className="mt-1 text-[18px] font-semibold text-text-main">{profile.name}</h2>
            <p className="mt-0.5 text-sm text-text-muted">
              {profile.system} / {profile.object} • Base: {profile.schemaPack.name} v{profile.schemaPack.version}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {profile.isPublished ? (
              <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">Published</span>
            ) : (
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">Draft</span>
            )}
            {profile.currentVersion && (
              <span className="text-xs text-text-muted">v{profile.currentVersion.version}</span>
            )}
            {driftCounts && (driftCounts.NEW > 0 || driftCounts.IN_REVIEW > 0) && (
              <Link
                href="/platform-admin/drift-review"
                className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
              >
                <span className="material-symbols-outlined text-[12px]">sync_problem</span>
                {driftCounts.NEW + driftCounts.IN_REVIEW} pending
              </Link>
            )}
            <PublishButton profileId={profile.id} currentVersion={profile.currentVersion} onPublished={load} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-border-soft bg-surface shadow-soft">
        <nav className="flex border-b border-border-soft px-4 pt-2" aria-label="Profile tabs">
          {TABS.map((tab) => {
            const pendingCount = tab === 'Drift' && driftCounts ? (driftCounts.NEW ?? 0) + (driftCounts.IN_REVIEW ?? 0) : 0;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`-mb-px px-3 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                {tab}
                {pendingCount > 0 && (
                  <span className="ml-1.5 inline-flex min-w-[16px] items-center justify-center rounded-full bg-rose-100 px-1 py-0.5 text-[9px] font-bold text-rose-700">
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 sm:p-5">
          {activeTab === 'Fields' && <FieldsTab profile={profile} onRefresh={load} />}
          {activeTab === 'Overlays' && <OverlaysTab profile={profile} onRefresh={load} />}
          {activeTab === 'Effective Schema' && <EffectiveSchemaTab profileId={profile.id} />}
          {activeTab === 'Versions' && <VersionsTab profileId={profile.id} />}
          {activeTab === 'Drift' && <DriftTab profileId={profile.id} />}
          {activeTab === 'Settings' && <SettingsTab profile={profile} onRefresh={load} />}
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  Publish Button                                                     */
/* ================================================================== */
function PublishButton({ profileId, currentVersion, onPublished }: { profileId: string; currentVersion: ProfileVersion | null; onPublished: () => void }) {
  const [showInput, setShowInput] = useState(false);
  const [version, setVersion] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestNextVersion = () => {
    if (!currentVersion) return '1.0.0';
    const parts = currentVersion.version.split('.').map(Number);
    parts[2] = (parts[2] ?? 0) + 1;
    return parts.join('.');
  };

  const handleOpen = () => {
    setVersion(suggestNextVersion());
    setError(null);
    setShowInput(true);
  };

  const handlePublish = async () => {
    if (!version.match(/^\d+\.\d+\.\d+$/)) {
      setError('Version must be semver (e.g. 1.0.0)');
      return;
    }
    try {
      setPublishing(true);
      setError(null);
      await api.post(`/target-profiles/${profileId}/publish`, { version });
      setShowInput(false);
      onPublished();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  if (!showInput) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-semibold text-white transition-colors hover:bg-primary/90"
      >
        <span className="material-symbols-outlined text-[16px]">publish</span>
        Publish Version
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={version}
        onChange={(e) => setVersion(e.target.value)}
        placeholder="1.0.0"
        className="h-8 w-24 rounded-md border border-border-soft bg-background-light px-2 text-xs font-mono"
      />
      <button
        type="button"
        onClick={handlePublish}
        disabled={publishing || !version}
        className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
      >
        {publishing ? 'Publishing…' : 'Confirm'}
      </button>
      <button type="button" onClick={() => setShowInput(false)} className="text-xs text-text-muted hover:underline">Cancel</button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}

/* ================================================================== */
/*  Fields Tab                                                         */
/* ================================================================== */
function FieldsTab({ profile, onRefresh }: { profile: TargetProfile; onRefresh: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<ProfileField>>({});

  const startEdit = (field: ProfileField) => {
    setEditingId(field.id);
    setEditValues({ businessName: field.businessName ?? '', description: field.description ?? '', validationRule: field.validationRule ?? '', defaultValue: field.defaultValue ?? '', required: field.required });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await api.patch(`/target-profiles/fields/${editingId}`, {
        businessName: editValues.businessName || null,
        description: editValues.description || null,
        validationRule: editValues.validationRule || null,
        defaultValue: editValues.defaultValue || null,
        required: editValues.required ?? false,
      });
      setEditingId(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to update field', err);
    }
  };

  const deleteField = async (fieldId: string) => {
    try {
      await api.delete(`/target-profiles/fields/${fieldId}`);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete field', err);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-text-main">{profile.fields.length} fields</p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border-soft">
        <table className="min-w-[900px] w-full border-collapse text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Path</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Type</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Req</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Business Name</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Validation</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Default</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted" />
            </tr>
          </thead>
          <tbody>
            {profile.fields.map((field) => (
              <tr key={field.id} className="border-t border-border-soft align-middle">
                <td className="px-3 py-2 text-xs font-mono text-text-main">{field.path}</td>
                <td className="px-3 py-2 text-xs text-text-muted">{field.dataType}</td>
                {editingId === field.id ? (
                  <>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={editValues.required ?? false}
                        onChange={(e) => setEditValues((v) => ({ ...v, required: e.target.checked }))}
                        className="h-4 w-4 rounded border-border-soft text-primary focus:ring-primary"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={editValues.businessName ?? ''}
                        onChange={(e) => setEditValues((v) => ({ ...v, businessName: e.target.value }))}
                        placeholder="e.g. Invoice Amount"
                        className="h-7 w-full rounded border border-border-soft bg-background-light px-2 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={editValues.validationRule ?? ''}
                        onChange={(e) => setEditValues((v) => ({ ...v, validationRule: e.target.value }))}
                        placeholder="e.g. ^[A-Z]{2}\d+$ or > 0"
                        className="h-7 w-full rounded border border-border-soft bg-background-light px-2 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={editValues.defaultValue ?? ''}
                        onChange={(e) => setEditValues((v) => ({ ...v, defaultValue: e.target.value }))}
                        placeholder="e.g. USD or 0"
                        className="h-7 w-full rounded border border-border-soft bg-background-light px-2 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button type="button" onClick={saveEdit} className="text-xs font-medium text-primary hover:underline">Save</button>
                        <button type="button" onClick={() => setEditingId(null)} className="text-xs text-text-muted hover:underline">Cancel</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2 text-xs text-center text-text-muted">{field.required ? '✓' : ''}</td>
                    <td className="px-3 py-2 text-xs text-text-main">{field.businessName || <span className="text-text-muted/50">—</span>}</td>
                    <td className="px-3 py-2 text-xs text-text-muted font-mono">{field.validationRule || <span className="text-text-muted/50">—</span>}</td>
                    <td className="px-3 py-2 text-xs text-text-muted">{field.defaultValue || <span className="text-text-muted/50">—</span>}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button type="button" onClick={() => startEdit(field)} className="text-xs font-medium text-primary hover:underline">Edit</button>
                        <button type="button" onClick={() => deleteField(field.id)} className="text-xs text-danger hover:underline">Del</button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Overlays Tab                                                       */
/* ================================================================== */
const OVERLAY_TYPES = ['FIELD_ALIAS', 'VALIDATION_RULE', 'DEFAULT_VALUE', 'FIELD_VISIBILITY', 'CUSTOM_TRANSFORM'] as const;

function OverlaysTab({ profile, onRefresh }: { profile: TargetProfile; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [overlayType, setOverlayType] = useState<string>(OVERLAY_TYPES[0]);
  const [fieldPath, setFieldPath] = useState('');
  const [configValue, setConfigValue] = useState('');
  const [saving, setSaving] = useState(false);

  const getConfigLabel = (type: string) => {
    switch (type) {
      case 'FIELD_ALIAS': return 'Alias';
      case 'VALIDATION_RULE': return 'Rule Expression';
      case 'DEFAULT_VALUE': return 'Default Value';
      case 'FIELD_VISIBILITY': return 'Visible (true/false)';
      case 'CUSTOM_TRANSFORM': return 'Expression';
      default: return 'Value';
    }
  };

  const buildConfig = () => {
    switch (overlayType) {
      case 'FIELD_ALIAS': return { fieldPath, alias: configValue };
      case 'VALIDATION_RULE': return { fieldPath, rule: configValue };
      case 'DEFAULT_VALUE': return { fieldPath, value: configValue };
      case 'FIELD_VISIBILITY': return { fieldPath, visible: configValue.toLowerCase() === 'true' };
      case 'CUSTOM_TRANSFORM': return { fieldPath, expression: configValue };
      default: return { fieldPath, value: configValue };
    }
  };

  const handleAdd = async () => {
    if (!fieldPath || !configValue) return;
    try {
      setSaving(true);
      await api.post(`/target-profiles/${profile.id}/overlays`, { overlayType, config: buildConfig() });
      setShowAdd(false);
      setFieldPath('');
      setConfigValue('');
      onRefresh();
    } catch (err) {
      console.error('Failed to add overlay', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (overlay: Overlay) => {
    try {
      await api.patch(`/target-profiles/overlays/${overlay.id}`, { isActive: !overlay.isActive });
      onRefresh();
    } catch (err) {
      console.error('Failed to toggle overlay', err);
    }
  };

  const deleteOverlay = async (overlayId: string) => {
    try {
      await api.delete(`/target-profiles/overlays/${overlayId}`);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete overlay', err);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-text-main">{profile.overlays.length} overlays</p>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-primary/30 bg-primary/[0.06] px-3 text-xs font-semibold text-primary hover:bg-primary/[0.12]"
        >
          <span className="material-symbols-outlined text-[16px]">add</span> Add Overlay
        </button>
      </div>

      {showAdd && (
        <div className="mb-4 rounded-lg border border-primary/20 bg-primary/[0.02] p-3 space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-text-muted">Type</label>
              <select
                value={overlayType}
                onChange={(e) => setOverlayType(e.target.value)}
                className="mt-1 h-8 w-full cursor-pointer appearance-none rounded-md border border-border-soft bg-background-light pl-2 pr-7 text-xs"
              >
                {OVERLAY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <TextField label="Field Path" value={fieldPath} onChange={setFieldPath} placeholder="e.g. invoice.header.amount" />
            <TextField label={getConfigLabel(overlayType)} value={configValue} onChange={setConfigValue} placeholder="Value…" />
            <div className="flex items-end gap-2">
              <button type="button" onClick={handleAdd} disabled={saving || !fieldPath || !configValue} className="h-10 rounded-lg bg-primary px-3 text-xs font-semibold text-white disabled:opacity-50">
                {saving ? 'Adding…' : 'Add'}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="h-10 rounded-lg border border-border-soft px-3 text-xs text-text-muted">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border-soft">
        <table className="min-w-[700px] w-full border-collapse text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Type</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Config</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Active</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted" />
            </tr>
          </thead>
          <tbody>
            {profile.overlays.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-xs text-text-muted">No overlays configured.</td></tr>
            )}
            {profile.overlays.map((o) => (
              <tr key={o.id} className="border-t border-border-soft align-middle">
                <td className="px-3 py-2">
                  <span className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-text-muted">
                    {o.overlayType}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-text-main font-mono max-w-[300px] truncate">
                  {JSON.stringify(o.config)}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => toggleActive(o)}
                    className={`inline-flex h-7 items-center justify-center rounded-md px-2 text-[10px] font-semibold transition-colors ${
                      o.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {o.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-3 py-2">
                  <button type="button" onClick={() => deleteOverlay(o.id)} className="text-xs text-danger hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Effective Schema Tab                                               */
/* ================================================================== */
function EffectiveSchemaTab({ profileId }: { profileId: string }) {
  const [schema, setSchema] = useState<EffectiveSchema | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<EffectiveSchema>(`/target-profiles/${profileId}/effective-schema`)
      .then(setSchema)
      .catch((err) => console.error('Failed to load effective schema', err))
      .finally(() => setLoading(false));
  }, [profileId]);

  if (loading) return <p className="text-sm text-text-muted">Resolving effective schema…</p>;
  if (!schema) return <p className="text-sm text-danger">Failed to load effective schema.</p>;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-text-main">{schema.fieldCount} effective fields</p>
        <p className="text-xs text-text-muted">Base: {schema.schemaPackName}</p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border-soft">
        <table className="min-w-[900px] w-full border-collapse text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Path</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Business Name</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Type</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Req</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Validation</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Default</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Source</th>
            </tr>
          </thead>
          <tbody>
            {schema.fields.map((f) => (
              <tr key={f.path} className="border-t border-border-soft align-middle">
                <td className="px-3 py-2 text-xs font-mono text-text-main">{f.path}</td>
                <td className="px-3 py-2 text-xs text-text-main">{f.businessName || <span className="text-text-muted/50">—</span>}</td>
                <td className="px-3 py-2 text-xs text-text-muted">{f.dataType}</td>
                <td className="px-3 py-2 text-xs text-text-muted">{f.required ? '✓' : ''}</td>
                <td className="px-3 py-2 text-xs text-text-muted font-mono">{f.validationRule || '—'}</td>
                <td className="px-3 py-2 text-xs text-text-muted">{f.defaultValue || '—'}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                    f.source === 'PROFILE' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {f.source}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Versions Tab                                                       */
/* ================================================================== */
function VersionsTab({ profileId }: { profileId: string }) {
  const [versions, setVersions] = useState<ProfileVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<VersionSnapshot | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);

  useEffect(() => {
    api.get<ProfileVersion[]>(`/target-profiles/${profileId}/versions`)
      .then(setVersions)
      .catch((err) => console.error('Failed to load versions', err))
      .finally(() => setLoading(false));
  }, [profileId]);

  const toggleExpand = async (v: ProfileVersion) => {
    if (expandedId === v.id) {
      setExpandedId(null);
      setSnapshot(null);
      return;
    }
    setExpandedId(v.id);
    setSnapshot(null);
    setLoadingSnapshot(true);
    try {
      const detail = await api.get<ProfileVersion>(`/target-profiles/versions/${v.id}`);
      setSnapshot(detail.snapshotJson ?? null);
    } catch (err) {
      console.error('Failed to load version detail', err);
    } finally {
      setLoadingSnapshot(false);
    }
  };

  if (loading) return <p className="text-sm text-text-muted">Loading versions…</p>;

  return (
    <div>
      <p className="text-sm font-semibold text-text-main mb-3">{versions.length} published versions</p>
      {versions.length === 0 ? (
        <p className="text-xs text-text-muted">No versions published yet. Use the "Publish Version" button in the header to create one.</p>
      ) : (
        <div className="space-y-2">
          {versions.map((v) => (
            <div key={v.id} className="rounded-lg border border-border-soft">
              <button
                type="button"
                onClick={() => toggleExpand(v)}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-7 items-center rounded-md bg-primary/[0.08] px-2 text-xs font-bold text-primary font-mono">v{v.version}</span>
                  <span className="text-xs text-text-muted">{new Date(v.publishedAt).toLocaleString()}</span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-text-muted transition-transform" style={{ transform: expandedId === v.id ? 'rotate(180deg)' : '' }}>
                  expand_more
                </span>
              </button>

              {expandedId === v.id && (
                <div className="border-t border-border-soft px-4 py-3">
                  {loadingSnapshot ? (
                    <p className="text-xs text-text-muted">Loading snapshot…</p>
                  ) : snapshot ? (
                    <SnapshotViewer snapshot={snapshot} />
                  ) : (
                    <p className="text-xs text-danger">Failed to load snapshot.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Snapshot Viewer (inline in Versions Tab)                           */
/* ------------------------------------------------------------------ */
function SnapshotViewer({ snapshot }: { snapshot: VersionSnapshot }) {
  const [showTab, setShowTab] = useState<'fields' | 'overlays'>('fields');
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-text-muted">
        <span><strong className="text-text-main">{snapshot.name}</strong> — {snapshot.system}/{snapshot.object}</span>
        <span>Base: {snapshot.schemaPack.name} v{snapshot.schemaPack.version}</span>
        <span>{snapshot.fields.length} fields</span>
        <span>{snapshot.overlays.length} overlays</span>
      </div>

      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setShowTab('fields')}
          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${showTab === 'fields' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:text-text-main'}`}
        >
          Fields ({snapshot.fields.length})
        </button>
        <button
          type="button"
          onClick={() => setShowTab('overlays')}
          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${showTab === 'overlays' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:text-text-main'}`}
        >
          Overlays ({snapshot.overlays.length})
        </button>
      </div>

      {showTab === 'fields' && (
        <div className="overflow-x-auto rounded-md border border-border-soft">
          <table className="min-w-[700px] w-full border-collapse text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Path</th>
                <th className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Type</th>
                <th className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Req</th>
                <th className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Business Name</th>
                <th className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Validation</th>
                <th className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Default</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.fields.map((f) => (
                <tr key={f.path} className="border-t border-border-soft">
                  <td className="px-2 py-1.5 text-[11px] font-mono text-text-main">{f.path}</td>
                  <td className="px-2 py-1.5 text-[11px] text-text-muted">{f.dataType}</td>
                  <td className="px-2 py-1.5 text-[11px] text-text-muted">{f.required ? '✓' : ''}</td>
                  <td className="px-2 py-1.5 text-[11px] text-text-main">{f.businessName || '—'}</td>
                  <td className="px-2 py-1.5 text-[11px] text-text-muted font-mono">{f.validationRule || '—'}</td>
                  <td className="px-2 py-1.5 text-[11px] text-text-muted">{f.defaultValue || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showTab === 'overlays' && (
        <div className="overflow-x-auto rounded-md border border-border-soft">
          <table className="w-full border-collapse text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Type</th>
                <th className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Config</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.overlays.length === 0 && (
                <tr><td colSpan={2} className="px-2 py-3 text-center text-[11px] text-text-muted">No overlays in this snapshot.</td></tr>
              )}
              {snapshot.overlays.map((o, i) => (
                <tr key={i} className="border-t border-border-soft">
                  <td className="px-2 py-1.5"><span className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-text-muted">{o.overlayType}</span></td>
                  <td className="px-2 py-1.5 text-[11px] text-text-main font-mono max-w-[400px] truncate">{JSON.stringify(o.config)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Drift Tab                                                          */
/* ================================================================== */
function DriftTab({ profileId }: { profileId: string }) {
  const [suggestions, setSuggestions] = useState<DriftSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);

  const load = useCallback(() => {
    api.get<DriftSuggestion[]>(`/target-profiles/${profileId}/drift-suggestions`)
      .then(setSuggestions)
      .catch((err) => console.error('Failed to load drift suggestions', err))
      .finally(() => setLoading(false));
  }, [profileId]);

  useEffect(() => { load(); }, [load]);

  const handleDetect = async () => {
    setDetecting(true);
    try {
      await api.post(`/target-profiles/${profileId}/detect-drift`, {});
      load();
    } catch (err) {
      console.error('Drift detection failed', err);
    } finally {
      setDetecting(false);
    }
  };

  const handleApply = async (id: string) => {
    try {
      await api.patch(`/target-profiles/drift-suggestions/${id}/apply`, {});
      setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, isApplied: true } : s)));
    } catch (err) {
      console.error('Failed to apply suggestion', err);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await api.delete(`/target-profiles/drift-suggestions/${id}`);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Failed to dismiss suggestion', err);
    }
  };

  if (loading) return <p className="text-sm text-text-muted">Loading drift suggestions…</p>;

  const pending = suggestions.filter((s) => !s.isApplied);
  const applied = suggestions.filter((s) => s.isApplied);

  const typeConfig: Record<string, { icon: string; color: string; bg: string; border: string }> = {
    NEW_FIELD: { icon: 'add_circle', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    DEPRECATED_FIELD: { icon: 'remove_circle', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
    TYPE_CHANGE: { icon: 'swap_horiz', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    CONSTRAINT_CHANGE: { icon: 'rule', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  };

  const renderDetails = (s: DriftSuggestion) => {
    const d = s.details;
    switch (s.suggestionType) {
      case 'TYPE_CHANGE':
        return (
          <span className="text-[11px] text-text-muted">
            <span className="font-mono text-red-600 line-through">{String(d.previousType ?? '')}</span>
            {' → '}
            <span className="font-mono text-emerald-600">{String(d.currentType ?? '')}</span>
          </span>
        );
      case 'NEW_FIELD':
        return (
          <span className="text-[11px] text-text-muted">
            Type: <span className="font-mono">{String(d.dataType ?? '')}</span>
            {d.required ? ' · Required' : ''}
            {d.source ? ` · Source: ${String(d.source)}` : ''}
          </span>
        );
      case 'DEPRECATED_FIELD':
        return (
          <span className="text-[11px] text-text-muted">
            Was: <span className="font-mono">{String(d.previousDataType ?? '')}</span>
            {d.wasRequired ? ' · Was required' : ''}
          </span>
        );
      case 'CONSTRAINT_CHANGE': {
        const changes = Object.entries(d).map(([key, val]) => {
          const v = val as { previous?: unknown; current?: unknown } | undefined;
          return `${key}: ${String(v?.previous ?? '∅')} → ${String(v?.current ?? '∅')}`;
        });
        return <span className="text-[11px] text-text-muted font-mono">{changes.join(' · ')}</span>;
      }
      default:
        return <span className="text-[11px] text-text-muted font-mono">{JSON.stringify(d)}</span>;
    }
  };

  const renderSuggestion = (s: DriftSuggestion) => {
    const cfg = typeConfig[s.suggestionType] ?? typeConfig.CONSTRAINT_CHANGE;
    return (
      <div key={s.id} className={`flex items-start gap-3 rounded-lg border ${cfg.border} ${cfg.bg} px-3 py-2.5`}>
        <span className={`material-symbols-outlined text-[18px] ${cfg.color} mt-0.5 shrink-0`}>{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-semibold text-text-main font-mono">{s.fieldPath}</span>
            <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${cfg.color} ${cfg.bg} border ${cfg.border}`}>
              {s.suggestionType.replace('_', ' ')}
            </span>
            {s.isApplied && (
              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
                <span className="material-symbols-outlined text-[10px]">check</span> Applied
              </span>
            )}
          </div>
          {renderDetails(s)}
          <p className="text-[10px] text-text-muted/60 mt-1">{new Date(s.createdAt).toLocaleString()}</p>
        </div>
        {!s.isApplied && (
          <div className="flex gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleApply(s.id)}
              className="inline-flex h-7 items-center gap-1 rounded-md bg-primary/10 px-2 text-[10px] font-semibold text-primary hover:bg-primary/20 transition-colors"
              title="Mark as applied — you've already updated your profile to reflect this change"
            >
              <span className="material-symbols-outlined text-[12px]">check</span>
              Apply
            </button>
            <button
              type="button"
              onClick={() => handleDismiss(s.id)}
              className="inline-flex h-7 items-center gap-1 rounded-md bg-slate-100 px-2 text-[10px] font-semibold text-text-muted hover:bg-slate-200 transition-colors"
              title="Dismiss — ignore this drift suggestion"
            >
              <span className="material-symbols-outlined text-[12px]">close</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-text-main">{suggestions.length} drift suggestions</p>
          {pending.length > 0 && (
            <p className="text-[11px] text-warning-text">{pending.length} pending review</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/platform-admin/drift-review"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            Full Drift Queue
          </Link>
          <button
            type="button"
            onClick={handleDetect}
            disabled={detecting}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border-soft bg-surface px-3 text-xs font-semibold text-text-main hover:bg-background-light transition-colors disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[16px] ${detecting ? 'animate-spin' : ''}`}>sync</span>
            {detecting ? 'Detecting…' : 'Detect Drift'}
          </button>
        </div>
      </div>

      {suggestions.length === 0 ? (
        <div className="rounded-lg border border-border-soft bg-surface px-6 py-8 text-center">
          <span className="material-symbols-outlined text-[32px] text-text-muted/30 mb-2">verified</span>
          <p className="text-sm font-medium text-text-main mb-1">No schema drift detected</p>
          <p className="text-xs text-text-muted">
            Click &ldquo;Detect Drift&rdquo; to compare the current schema against the last published version.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-2">Pending Review</p>
              <div className="space-y-2">{pending.map(renderSuggestion)}</div>
            </div>
          )}
          {applied.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-2">Applied</p>
              <div className="space-y-2 opacity-60">{applied.map(renderSuggestion)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Settings Tab                                                       */
/* ================================================================== */
function SettingsTab({ profile, onRefresh }: { profile: TargetProfile; onRefresh: () => void }) {
  const [name, setName] = useState(profile.name);
  const [description, setDescription] = useState(profile.description ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.patch(`/target-profiles/${profile.id}`, { name, description: description || null });
      onRefresh();
    } catch (err) {
      console.error('Failed to update profile', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this target profile? This cannot be undone.')) return;
    try {
      setDeleting(true);
      await api.delete(`/target-profiles/${profile.id}`);
      window.location.href = '/platform-admin/target-profiles';
    } catch (err) {
      console.error('Failed to delete profile', err);
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-lg space-y-4">
      <TextField label="Profile Name" value={name} onChange={setName} required />
      <TextField label="Description" value={description} onChange={setDescription} />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !name}
          className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <hr className="border-border-soft" />

      <div>
        <p className="text-sm font-semibold text-danger">Danger Zone</p>
        <p className="mt-1 text-xs text-text-muted">Deleting this profile will remove all fields, overlays, versions, and drift suggestions.</p>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="mt-2 inline-flex h-9 items-center rounded-lg border border-danger/30 bg-danger/[0.06] px-4 text-sm font-semibold text-danger hover:bg-danger/[0.12] disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Delete Profile'}
        </button>
      </div>
    </div>
  );
}
