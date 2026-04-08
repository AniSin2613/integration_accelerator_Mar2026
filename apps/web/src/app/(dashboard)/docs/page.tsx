'use client';

import Link from 'next/link';

const SECTIONS = [
  {
    title: 'Getting Started',
    icon: 'rocket_launch',
    description: 'Learn how to set up your first integration with Cogniviti Bridge.',
    href: '/docs/getting-started',
  },
  {
    title: 'Integration Builder',
    icon: 'hub',
    description: 'Understand the drag-and-drop workflow builder and Apache Camel route generation.',
    href: '/docs/getting-started#builder',
  },
  {
    title: 'Connections',
    icon: 'cable',
    description: 'Configure and test connections to external systems.',
    href: '/docs/getting-started#connections',
  },
  {
    title: 'Templates',
    icon: 'layers',
    description: 'Browse and use pre-built integration templates.',
    href: '/docs/getting-started#templates',
  },
  {
    title: 'Monitoring & Logs',
    icon: 'monitor_heart',
    description: 'Monitor workflow runs, view logs, and troubleshoot errors via Apache Camel.',
    href: '/docs/getting-started#monitoring',
  },
  {
    title: 'API Reference',
    icon: 'api',
    description: 'Explore the REST API for programmatic access to Cogniviti Bridge.',
    href: '/docs/getting-started#api',
  },
];

export default function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <h1 className="text-2xl font-bold text-text-main">Documentation</h1>
      <p className="mt-2 text-sm text-text-muted">
        Learn how to build, deploy, and monitor integrations with Cogniviti Bridge — a UI layer for Apache Camel.
      </p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SECTIONS.map((section) => (
          <Link
            key={section.title}
            href={section.href}
            className="group flex gap-4 rounded-xl border border-border-soft bg-surface p-5 hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[24px] text-primary shrink-0 mt-0.5">
              {section.icon}
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-text-main group-hover:text-primary transition-colors">
                {section.title}
              </p>
              <p className="mt-1 text-[13px] text-text-muted leading-relaxed">
                {section.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
