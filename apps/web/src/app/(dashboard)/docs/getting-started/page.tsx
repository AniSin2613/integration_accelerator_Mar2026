'use client';

export default function GettingStartedPage() {
  return (
    <article className="max-w-3xl mx-auto py-10 px-6 prose prose-sm prose-slate">
      <h1 className="text-2xl font-bold text-text-main">Getting Started</h1>
      <p className="text-text-muted">
        Cogniviti Bridge is a UI wrapper for Apache Camel. All data transformation, routing, and
        execution happens through Camel routes — Bridge provides the visual interface to manage them.
      </p>

      <section id="overview" className="mt-8">
        <h2 className="text-lg font-semibold text-text-main">Overview</h2>
        <ol className="mt-3 space-y-3 text-[14px] text-text-muted list-decimal pl-5">
          <li>
            <strong className="text-text-main">Create a Connection</strong> — Navigate to
            <em> Connections</em> and configure credentials for your source and target systems.
          </li>
          <li>
            <strong className="text-text-main">Build an Integration</strong> — Use the Integration
            Builder to design a workflow. Behind the scenes, this generates an Apache Camel YAML
            route.
          </li>
          <li>
            <strong className="text-text-main">Test &amp; Preview</strong> — Run a preview
            execution. Cogniviti Bridge sends the route to the Camel runner which executes it and
            returns logs and payloads.
          </li>
          <li>
            <strong className="text-text-main">Deploy</strong> — Promote your integration through
            Dev → Test → Prod environments.
          </li>
          <li>
            <strong className="text-text-main">Monitor</strong> — View run history, logs, and error
            details from the Monitoring dashboard. All log data originates from Apache Camel.
          </li>
        </ol>
      </section>

      <section id="builder" className="mt-10">
        <h2 className="text-lg font-semibold text-text-main">Integration Builder</h2>
        <p className="mt-2 text-[14px] text-text-muted leading-relaxed">
          The visual builder lets you compose workflows by picking a source, adding transformations,
          and choosing a target. Each workflow step maps to a node in an Apache Camel route. You can
          preview the generated YAML at any time.
        </p>
      </section>

      <section id="connections" className="mt-10">
        <h2 className="text-lg font-semibold text-text-main">Connections</h2>
        <p className="mt-2 text-[14px] text-text-muted leading-relaxed">
          Connections store the credentials and endpoint information needed to reach external
          systems. When you test a connection, Cogniviti Bridge delegates the test to the Camel
          runner, which attempts a handshake with the target system and returns the result.
        </p>
      </section>

      <section id="templates" className="mt-10">
        <h2 className="text-lg font-semibold text-text-main">Templates</h2>
        <p className="mt-2 text-[14px] text-text-muted leading-relaxed">
          Templates are pre-configured integration patterns (e.g., SAP-to-Salesforce). Using a
          template bootstraps a new integration with recommended steps, mappings, and error handling
          already in place.
        </p>
      </section>

      <section id="monitoring" className="mt-10">
        <h2 className="text-lg font-semibold text-text-main">Monitoring &amp; Logs</h2>
        <p className="mt-2 text-[14px] text-text-muted leading-relaxed">
          The Monitoring page shows all workflow runs. Logs, error stack traces, and step-level
          timings are retrieved from Apache Camel. You can replay failed runs and approve pending
          steps from the same interface.
        </p>
      </section>

      <section id="api" className="mt-10">
        <h2 className="text-lg font-semibold text-text-main">API Reference</h2>
        <p className="mt-2 text-[14px] text-text-muted leading-relaxed">
          The Cogniviti Bridge API (NestJS, port 4000) exposes REST endpoints for integrations,
          connections, templates, runs, and more. Use the <code>/api</code> prefix when calling from
          the frontend; the Next.js proxy rewrites requests to the backend.
        </p>
      </section>
    </article>
  );
}
