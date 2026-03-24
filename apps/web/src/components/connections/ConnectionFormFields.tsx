'use client';

import { useState } from 'react';
import {
  TextField,
  NumberField,
  SelectField,
  SecretField,
  CheckboxField,
  KeyValueListEditor,
} from '@/components/ui/FormFields';
import {
  type ConnectionConfig,
  type ConnectionFamily,
  type RestAuthMethod,
  type SftpAuthMode,
  type S3CredentialMode,
} from './types';

/* Re-export shared form primitives so existing import paths continue to work */
export { TextField, NumberField, SelectField, SecretField } from '@/components/ui/FormFields';

/* ------------------------------------------------------------------ */
/*  Family-specific config editors                                     */
/* ------------------------------------------------------------------ */

export function FamilySpecificEditor({
  config,
  onChange,
  lastBearerToken,
}: {
  config: ConnectionConfig;
  onChange: (updates: Partial<ConnectionConfig>) => void;
  lastBearerToken?: string;
}) {
  if (config.family === 'REST / OpenAPI outbound') {
    return <RestEditor config={config} onChange={onChange} lastBearerToken={lastBearerToken} />;
  }
  if (config.family === 'Webhook / HTTP inbound') {
    return <WebhookEditor config={config} onChange={onChange} />;
  }
  if (config.family === 'SFTP / File') {
    return <SftpEditor config={config} onChange={onChange} />;
  }
  if (config.family === 'Database') {
    return <DatabaseEditor config={config} onChange={onChange} />;
  }
  return <S3Editor config={config} onChange={onChange} />;
}

function RestEditor({
  config,
  onChange,
  lastBearerToken,
}: {
  config: ConnectionConfig & { family: 'REST / OpenAPI outbound' };
  onChange: (u: Partial<ConnectionConfig>) => void;
  lastBearerToken?: string;
}) {
  return (
    <section className="rounded-lg border border-border-soft bg-background-light p-4">
      <p className="text-sm font-semibold text-text-main">REST / OpenAPI Settings</p>
      <div className="mt-3 grid grid-cols-1 gap-3">
        <TextField label="Base URL" value={config.baseUrl} onChange={(v) => onChange({ baseUrl: v })} required />
        <SelectField
          label="Auth Method"
          value={config.authMethod}
          options={['None', 'API Key', 'Basic', 'Bearer Token', 'OAuth 2.0', 'Mutual TLS']}
          onChange={(v) => onChange({ authMethod: v as RestAuthMethod })}
          required
        />
        {config.authMethod === 'API Key' && (
          <>
            <TextField label="API Key Name" value={config.apiKeyName ?? ''} onChange={(v) => onChange({ apiKeyName: v || undefined })} required />
            <SelectField label="API Key Placement" value={config.apiKeyPlacement ?? 'Header'} options={['Header', 'Query']} onChange={(v) => onChange({ apiKeyPlacement: v as 'Header' | 'Query' })} required />
            <SecretField label="API Key Value" value={config.apiKeyValueRef ?? ''} onChange={(v) => onChange({ apiKeyValueRef: v || undefined })} placeholder="Enter API key" />
          </>
        )}
        {config.authMethod === 'Basic' && (
          <>
            <TextField label="Username" value={config.basicUsername ?? ''} onChange={(v) => onChange({ basicUsername: v || undefined })} required />
            <SecretField label="Password" value={config.basicPasswordRef ?? ''} onChange={(v) => onChange({ basicPasswordRef: v || undefined })} placeholder="Enter password" />
          </>
        )}
        {config.authMethod === 'Bearer Token' && (
          <SecretField label="Bearer Token" value={config.bearerTokenRef ?? ''} onChange={(v) => onChange({ bearerTokenRef: v || undefined })} placeholder="Enter bearer token" />
        )}
        {config.authMethod === 'OAuth 2.0' && (
          <>
            <TextField label="Client ID" value={config.oauthClientId ?? ''} onChange={(v) => onChange({ oauthClientId: v || undefined })} required />
            <SecretField label="Client Secret" value={config.oauthClientSecretRef ?? ''} onChange={(v) => onChange({ oauthClientSecretRef: v || undefined })} placeholder="Enter client secret" />
            <TextField label="Token Endpoint" value={config.oauthTokenEndpoint ?? ''} onChange={(v) => onChange({ oauthTokenEndpoint: v || undefined })} required />
            <TextField label="Scope" value={config.oauthScope ?? ''} onChange={(v) => onChange({ oauthScope: v || undefined })} placeholder="e.g. openid profile email" />
            <CheckboxField label="Auto-refresh token" checked={config.oauthAutoRefresh ?? false} onChange={(v) => onChange({ oauthAutoRefresh: v })} />
            {config.oauthAutoRefresh && (
              <NumberField label="Refresh Interval (minutes)" value={config.oauthAutoRefreshIntervalMin ?? 55} onChange={(v) => onChange({ oauthAutoRefreshIntervalMin: v })} />
            )}
            <BearerTokenDisplay token={lastBearerToken} />
          </>
        )}
        {config.authMethod === 'Mutual TLS' && (
          <>
            <SecretField label="Keystore / Certificate" value={config.mtlsKeystoreRef ?? ''} onChange={(v) => onChange({ mtlsKeystoreRef: v || undefined })} placeholder="Enter keystore or certificate value" required />
            <SecretField label="Truststore / SSL Context" value={config.mtlsSslContextRef ?? ''} onChange={(v) => onChange({ mtlsSslContextRef: v || undefined })} placeholder="Enter truststore or SSL context value" required />
          </>
        )}
        <NumberField label="Timeout (ms)" value={config.timeoutMs ?? 10000} onChange={(v) => onChange({ timeoutMs: v })} />
        {config.authMethod !== 'None' && (
          <KeyValueListEditor
            label="Custom Auth Parameters"
            entries={config.customAuthParams ?? []}
            onChange={(entries) => onChange({ customAuthParams: entries })}
          />
        )}
      </div>
    </section>
  );
}

function WebhookEditor({
  config,
  onChange,
}: {
  config: ConnectionConfig & { family: 'Webhook / HTTP inbound' };
  onChange: (u: Partial<ConnectionConfig>) => void;
}) {
  return (
    <section className="rounded-lg border border-border-soft bg-background-light p-4">
      <p className="text-sm font-semibold text-text-main">Webhook / HTTP Inbound Settings</p>
      <div className="mt-3 grid grid-cols-1 gap-3">
        <TextField label="Path" value={config.path} onChange={(v) => onChange({ path: v })} required />
        <TextField
          label="Allowed Methods (comma separated)"
          value={config.methods.join(', ')}
          onChange={(v) => onChange({ methods: v.split(',').map((s) => s.trim()).filter(Boolean) })}
          placeholder="POST, PUT"
          required
        />
        <TextField label="Consumes" value={config.consumes} onChange={(v) => onChange({ consumes: v })} required />
      </div>
    </section>
  );
}

function SftpEditor({
  config,
  onChange,
}: {
  config: ConnectionConfig & { family: 'SFTP / File' };
  onChange: (u: Partial<ConnectionConfig>) => void;
}) {
  return (
    <section className="rounded-lg border border-border-soft bg-background-light p-4">
      <p className="text-sm font-semibold text-text-main">SFTP / File Settings</p>
      <div className="mt-3 grid grid-cols-1 gap-3">
        <TextField label="Host" value={config.host} onChange={(v) => onChange({ host: v })} required />
        <NumberField label="Port" value={config.port} onChange={(v) => onChange({ port: v })} required />
        <TextField label="Path" value={config.path} onChange={(v) => onChange({ path: v })} required />
        <TextField label="Username" value={config.username} onChange={(v) => onChange({ username: v })} required />
        <SelectField
          label="Auth Mode"
          value={config.authMode}
          options={['Password', 'Private Key']}
          onChange={(v) => onChange({ authMode: v as SftpAuthMode })}
          required
        />
      </div>
    </section>
  );
}

function DatabaseEditor({
  config,
  onChange,
}: {
  config: ConnectionConfig & { family: 'Database' };
  onChange: (u: Partial<ConnectionConfig>) => void;
}) {
  return (
    <section className="rounded-lg border border-border-soft bg-background-light p-4">
      <p className="text-sm font-semibold text-text-main">Database Settings</p>
      <div className="mt-3 grid grid-cols-1 gap-3">
        <TextField label="DB Engine" value={config.dbEngine} onChange={(v) => onChange({ dbEngine: v })} required />
        <TextField label="Host" value={config.host} onChange={(v) => onChange({ host: v })} required />
        <NumberField label="Port" value={config.port} onChange={(v) => onChange({ port: v })} required />
        <TextField label="Database / Service Name" value={config.databaseName} onChange={(v) => onChange({ databaseName: v })} required />
        <TextField label="Username" value={config.username} onChange={(v) => onChange({ username: v })} required />
      </div>
    </section>
  );
}

function S3Editor({
  config,
  onChange,
}: {
  config: ConnectionConfig & { family: 'S3-compatible storage' };
  onChange: (u: Partial<ConnectionConfig>) => void;
}) {
  return (
    <section className="rounded-lg border border-border-soft bg-background-light p-4">
      <p className="text-sm font-semibold text-text-main">S3-Compatible Storage Settings</p>
      <div className="mt-3 grid grid-cols-1 gap-3">
        <TextField label="Bucket" value={config.bucket} onChange={(v) => onChange({ bucket: v })} required />
        <TextField label="Region" value={config.region} onChange={(v) => onChange({ region: v })} required />
        <SelectField
          label="Credential Mode"
          value={config.credentialMode}
          options={['Access Key / Secret Key', 'Profile / Default Credentials']}
          onChange={(v) => onChange({ credentialMode: v as S3CredentialMode })}
          required
        />
        <TextField
          label="Custom Endpoint URL (optional)"
          value={config.customEndpointUrl ?? ''}
          onChange={(v) => onChange({ customEndpointUrl: v || undefined })}
        />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Bearer Token Display (for OAuth 2.0)                               */
/* ------------------------------------------------------------------ */

export function BearerTokenDisplay({ token }: { token?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="rounded-lg border border-border-soft bg-surface p-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Bearer Token</span>
      {token ? (
        <div className="mt-1 flex items-center gap-2">
          <code className="flex-1 break-all text-xs text-text-main font-mono bg-background-light rounded px-2 py-1.5 max-h-24 overflow-y-auto">
            {visible ? token : '••••••••••••••••••••••••••••••••'}
          </code>
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="shrink-0 text-text-muted hover:text-text-main"
            title={visible ? 'Hide token' : 'Reveal token'}
          >
            {visible ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.092 1.092a4 4 0 00-5.558-5.558z" clipRule="evenodd" />
                <path d="M10.748 13.93l2.523 2.523A9.987 9.987 0 0110 17c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 012.838-4.826L6.29 8.17A4 4 0 0010.749 13.93z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      ) : (
        <p className="mt-1 text-sm italic text-text-muted">Token will appear here after a successful connection test</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Read-only config display (for view mode)                           */
/* ------------------------------------------------------------------ */

export function labelValueRows(config: ConnectionConfig, lastBearerToken?: string): Array<{ label: string; value: string }> {
  if (config.family === 'REST / OpenAPI outbound') {
    const rows: Array<{ label: string; value: string }> = [
      { label: 'Base URL', value: config.baseUrl || '--' },
      { label: 'Auth Method', value: config.authMethod },
    ];
    if (config.authMethod === 'API Key') {
      rows.push({ label: 'API Key Name', value: config.apiKeyName || '--' });
      rows.push({ label: 'API Key Placement', value: config.apiKeyPlacement || '--' });
      rows.push({ label: 'API Key Value', value: config.apiKeyValueRef ? '••••••••' : '--' });
    }
    if (config.authMethod === 'Basic') {
      rows.push({ label: 'Username', value: config.basicUsername || '--' });
      rows.push({ label: 'Password', value: config.basicPasswordRef ? '••••••••' : '--' });
    }
    if (config.authMethod === 'Bearer Token') {
      rows.push({ label: 'Bearer Token', value: config.bearerTokenRef ? '••••••••' : '--' });
    }
    if (config.authMethod === 'OAuth 2.0') {
      rows.push({ label: 'Client ID', value: config.oauthClientId || '--' });
      rows.push({ label: 'Client Secret', value: config.oauthClientSecretRef ? '••••••••' : '--' });
      rows.push({ label: 'Token Endpoint', value: config.oauthTokenEndpoint || '--' });
      rows.push({ label: 'Scope', value: config.oauthScope || '--' });
      rows.push({ label: 'Auto-refresh Token', value: config.oauthAutoRefresh ? 'Enabled' : 'Disabled' });
      if (config.oauthAutoRefresh) {
        rows.push({ label: 'Refresh Interval', value: `${config.oauthAutoRefreshIntervalMin ?? 55} min` });
      }
      rows.push({ label: 'Bearer Token', value: lastBearerToken ? `${lastBearerToken.slice(0, 12)}…` : 'Not yet acquired' });
    }
    if (config.authMethod === 'Mutual TLS') {
      rows.push({ label: 'Keystore / Certificate', value: config.mtlsKeystoreRef ? '••••••••' : '--' });
      rows.push({ label: 'Truststore / SSL Context', value: config.mtlsSslContextRef ? '••••••••' : '--' });
    }
    rows.push({ label: 'Timeout (ms)', value: String(config.timeoutMs ?? '--') });
    if (config.customAuthParams && config.customAuthParams.length > 0) {
      const paramStr = config.customAuthParams
        .filter((p) => p.key)
        .map((p) => `${p.key}=${p.value}`)
        .join(', ');
      rows.push({ label: 'Custom Auth Params', value: paramStr || '--' });
    }
    return rows;
  }
  if (config.family === 'Webhook / HTTP inbound') {
    return [
      { label: 'Path', value: config.path },
      { label: 'Methods', value: config.methods.join(', ') },
      { label: 'Consumes', value: config.consumes },
    ];
  }
  if (config.family === 'SFTP / File') {
    return [
      { label: 'Host', value: config.host || '--' },
      { label: 'Port', value: String(config.port) },
      { label: 'Path', value: config.path },
      { label: 'Username', value: config.username || '--' },
      { label: 'Auth Mode', value: config.authMode },
    ];
  }
  if (config.family === 'Database') {
    return [
      { label: 'DB Engine', value: config.dbEngine },
      { label: 'Host', value: config.host || '--' },
      { label: 'Port', value: String(config.port) },
      { label: 'Database / Service', value: config.databaseName || '--' },
      { label: 'Schema', value: config.schema || '--' },
    ];
  }
  return [
    { label: 'Bucket', value: config.bucket },
    { label: 'Region', value: config.region },
    { label: 'Credential Mode', value: config.credentialMode },
    { label: 'Custom Endpoint', value: config.customEndpointUrl || '--' },
    { label: 'Path Style', value: config.pathStyleEnabled ? 'Enabled' : 'Disabled' },
  ];
}
