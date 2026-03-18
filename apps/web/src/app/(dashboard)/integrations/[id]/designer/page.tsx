'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { WorkflowCanvas, type WorkflowBoxDef, type BoxRole } from '@/components/workflow/WorkflowCanvas';
import { api } from '@/lib/api-client';

interface IntegrationDetail {
  id: string;
  name: string;
  status: string;
  description: string | null;
  templateVersion?: {
    version: string;
    workflowStructure?: { boxes?: RawBox[] };
    templateDefinition?: { name: string; sourceSystem: string | null; targetSystem: string | null };
  };
}

interface RawBox {
  id: string;
  role: string;
  title: string;
  subtitle?: string;
  config?: Record<string, unknown>;
}

const CONFIG_LABELS: Record<string, Record<string, string>> = {
  trigger:  { method: 'HTTP Method', path: 'Path', description: 'Description' },
  source:   { url: 'Source URL', method: 'Method', authType: 'Auth Type' },
  mapping:  { mappingSetId: 'Mapping Set ID', strategy: 'Strategy' },
  target:   { url: 'Target URL', method: 'Method', authType: 'Auth Type' },
  error:    { handler: 'Handler', retries: 'Max Retries', dlqTopic: 'DLQ Topic' },
};

const DEFAULT_BOXES: WorkflowBoxDef[] = [
  { id: 'trigger',  role: 'trigger',  title: 'HTTP Trigger',      subtitle: 'POST /invoke' },
  { id: 'source',   role: 'source',   title: 'Source REST Fetch',  subtitle: 'GET /source-api' },
  { id: 'mapping',  role: 'mapping',  title: 'Field Mapping',      subtitle: 'mapping set' },
  { id: 'target',   role: 'target',   title: 'Target Delivery',    subtitle: 'POST /target-api' },
  { id: 'error',    role: 'error',    title: 'Error Handler',      subtitle: 'Log + dead-letter' },
];

export default function DesignerPage({ params }: { params: { id: string } }) {
  const [integration, setIntegration] = useState<IntegrationDetail | null>(null);
  const [boxes, setBoxes] = useState<WorkflowBoxDef[]>(DEFAULT_BOXES);
  const [selected, setSelected] = useState<string | null>(null);
  const [yamlPreview, setYamlPreview] = useState<string>('');
  const [yamlLoading, setYamlLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<IntegrationDetail>(`/integrations/${params.id}`).then((d) => {
      setIntegration(d);
      const rawBoxes = d.templateVersion?.workflowStructure?.boxes;
      if (rawBoxes && rawBoxes.length > 0) {
        setBoxes(rawBoxes.map((b) => ({ ...b, role: b.role as BoxRole })));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [params.id]);

  const selectedBox = boxes.find((b) => b.id === selected);
  const configLabels = selectedBox ? (CONFIG_LABELS[selectedBox.role] ?? {}) : {};

  return (
    <div className="flex h-full min-h-screen bg-bg-canvas">
      {/* Left palette */}
      <aside className="w-56 flex-shrink-0 border-r border-border-soft bg-surface p-4 flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2">Components</p>
        {(
          [
            { role: 'trigger',  icon: 'play_circle',    label: 'Trigger' },
            { role: 'source',   icon: 'cloud_download', label: 'Source' },
            { role: 'mapping',  icon: 'transform',      label: 'Mapping' },
            { role: 'target',   icon: 'cloud_upload',   label: 'Target' },
            { role: 'error',    icon: 'error_outline',  label: 'Error Handler' },
          ] as const
        ).map((item) => (
          <div
            key={item.role}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border-soft bg-bg-canvas text-sm text-text-muted hover:border-primary/30 hover:text-primary cursor-default transition-colors select-none"
          >
            <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
            {item.label}
          </div>
        ))}

        <div className="mt-auto pt-4 border-t border-border-soft text-[11px] text-text-muted/60 leading-relaxed">
          Click a box in the canvas to inspect its configuration.
        </div>
      </aside>

      {/* Canvas */}
      <main className="flex-1 overflow-auto flex flex-col">
        {/* Integration header */}
        <div className="px-8 py-4 border-b border-border-soft bg-surface/80 backdrop-blur sticky top-0 z-10 flex items-center gap-4">
          <Link href="/integrations" className="text-text-muted hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </Link>
          {loading ? (
            <span className="text-sm text-text-muted">Loading…</span>
          ) : (
            <>
              <span className="font-semibold text-text-main">{integration?.name ?? params.id}</span>
              {integration?.templateVersion?.templateDefinition?.name && (
                <span className="text-xs text-text-muted border border-border-soft rounded-full px-2 py-0.5">
                  {integration.templateVersion.templateDefinition.name} v{integration.templateVersion.version}
                </span>
              )}
            </>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={async () => {
                setYamlLoading(true);
                const out = await api
                  .post<{ yaml: string }>(`/integrations/${params.id}/generate-yaml`, {})
                  .catch(() => null);
                setYamlPreview(out?.yaml ?? '# Unable to generate YAML for this integration');
                setYamlLoading(false);
              }}
              className="text-xs px-3 py-1.5 rounded-lg border border-border-soft bg-bg-canvas text-text-muted font-medium hover:border-primary/30 hover:text-primary transition-colors"
            >
              {yamlLoading ? 'Generating…' : 'Generate Camel YAML'}
            </button>
            <Link
              href={`/integrations/${params.id}/mappings`}
              className="text-xs text-primary font-medium hover:underline"
            >
              View Mappings
            </Link>
            <Link
              href={`/integrations/${params.id}/releases`}
              className="text-xs text-primary font-medium hover:underline"
            >
              Releases
            </Link>
          </div>
        </div>

        {/* Workflow canvas */}
        <div className="flex-1 p-12 flex flex-col items-center gap-8">
          <WorkflowCanvas boxes={boxes} selectedId={selected ?? undefined} onSelect={setSelected} />

          {yamlPreview && (
            <div className="w-full max-w-[1000px] bg-surface rounded-xl border border-border-soft shadow-soft overflow-hidden">
              <div className="px-4 py-2 border-b border-border-soft bg-bg-canvas text-xs font-semibold text-text-muted uppercase tracking-wide">
                Generated Camel Route YAML
              </div>
              <pre className="p-4 text-xs font-mono text-text-muted overflow-x-auto max-h-[320px]">
                {yamlPreview}
              </pre>
            </div>
          )}
        </div>
      </main>

      {/* Right config panel */}
      <aside className="w-72 flex-shrink-0 border-l border-border-soft bg-surface p-5 overflow-y-auto">
        {selectedBox ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-text-main text-sm">{selectedBox.title}</p>
              <button onClick={() => setSelected(null)} className="text-text-muted hover:text-text-main">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-3">Configuration</p>

            {selectedBox.config && Object.keys(selectedBox.config).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(selectedBox.config).map(([key, val]) => (
                  <div key={key}>
                    <label className="block text-[11px] text-text-muted mb-1">
                      {configLabels[key] ?? key}
                    </label>
                    <div className="w-full rounded-lg border border-border-soft bg-bg-canvas px-3 py-2 text-sm font-mono text-text-main">
                      {String(val)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted">No configuration stored for this box.</p>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="material-symbols-outlined text-[40px] text-text-muted/30">touch_app</span>
            <p className="text-xs text-text-muted">Select a box on the canvas to inspect its configuration.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
