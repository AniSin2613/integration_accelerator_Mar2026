'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function HeroPage() {
  return (
    <div className="bg-background-light font-display min-h-screen text-text-main overflow-x-hidden">
      {/* Hero Animation Styles */}
      <style jsx global>{`
        .workflow-node {
          transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.5s ease, border-color 0.5s ease, opacity 0.5s ease;
        }
        .ambient-glow {
          opacity: 0.34;
          animation: ambient-pulse 7s ease-in-out infinite;
          transition: opacity 1s ease;
        }
        .connector-path {
          stroke: #94A3B8;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 7 7;
          opacity: 0.95;
          transition: stroke 0.4s ease, opacity 0.4s ease;
        }
        .node-validation {
          opacity: 0.78;
          filter: saturate(0.82);
        }
        .mapping-line {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          opacity: 0.3;
        }
        .ai-chip, .transform-chip, .validation-status {
          opacity: 0;
          transition: all 0.4s ease;
        }
        .transform-chip { transform: scale(0.8); }
        .source-icon-pulse {
          animation: none;
        }
        .last-run-value {
          opacity: 0;
          transition: opacity 0.8s ease 0.5s;
        }
        @keyframes connector-flow {
          0% { stroke-dasharray: 0 200; stroke-dashoffset: 0; }
          100% { stroke-dasharray: 200 0; stroke-dashoffset: 0; }
        }
        @keyframes ambient-pulse {
          0%, 100% { opacity: 0.26; transform: scale(1); }
          50% { opacity: 0.42; transform: scale(1.04); }
        }
        @keyframes pulse-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.6); opacity: 0.4; }
        }
        @keyframes icon-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(191, 45, 66, 0); }
          50% { transform: scale(1.12); box-shadow: 0 0 14px 4px rgba(191, 45, 66, 0.18); }
        }

        /* ── Scene 1: Calm overview (0–1.8s) ── */
        .scene-1 .ambient-glow {
          opacity: 0.4;
        }

        /* ── Scene 2: Source activation (1.8–3.2s) ── */
        .scene-2 .node-source {
          transform: scale(1.04);
          border-color: #BF2D42 !important;
          box-shadow: 0 0 24px rgba(191, 45, 66, 0.22);
        }
        .scene-2 .source-icon-pulse {
          animation: icon-pulse 0.8s ease-in-out 1;
        }
        .scene-2 .connector-trigger-source {
          stroke: #BF2D42;
          opacity: 1;
          animation: connector-flow 0.7s linear forwards;
        }
        .scene-2 .connector-source-mapping {
          stroke: #BF2D42;
          opacity: 1;
          animation: connector-flow 1.1s linear 0.4s both;
        }

        /* ── Scene 3: Mapping focus (3.2–6.0s) — source stays softly active ── */
        .scene-3 .node-source {
          border-color: rgba(191, 45, 66, 0.25) !important;
          box-shadow: 0 0 10px rgba(191, 45, 66, 0.08);
        }
        .scene-3 .connector-trigger-source {
          stroke: rgba(191, 45, 66, 0.35);
          opacity: 1;
          stroke-dasharray: 200 0;
        }
        .scene-3 .connector-source-mapping {
          stroke: rgba(191, 45, 66, 0.35);
          opacity: 1;
          stroke-dasharray: 200 0;
        }
        .scene-3 .node-mapping {
          transform: scale(1.04);
          border-color: #0EA5E9 !important;
          box-shadow: 0 0 34px rgba(14, 165, 233, 0.22);
        }
        .scene-3 .mapping-line {
          stroke: #0EA5E9;
          opacity: 1;
          stroke-dashoffset: 0;
          transition: stroke-dashoffset 2.2s ease-in-out;
        }
        .scene-3 .ai-chip { opacity: 1; transform: translateY(0); }
        .scene-3 .transform-chip { opacity: 1; transform: scale(1); }

        /* ── Scene 4: Validation + delivery (6.0–8.0s) — source+mapping stay contextual ── */
        .scene-4 .node-source {
          border-color: rgba(191, 45, 66, 0.15) !important;
        }
        .scene-4 .connector-trigger-source,
        .scene-4 .connector-source-mapping {
          stroke: rgba(191, 45, 66, 0.2);
          opacity: 1;
          stroke-dasharray: 200 0;
        }
        .scene-4 .node-mapping {
          border-color: rgba(14, 165, 233, 0.3) !important;
          box-shadow: 0 0 12px rgba(14, 165, 233, 0.08);
        }
        .scene-4 .ai-chip { opacity: 0.6; }
        .scene-4 .transform-chip { opacity: 0.6; transform: scale(1); }
        .scene-4 .mapping-line {
          stroke: rgba(14, 165, 233, 0.5);
          opacity: 0.6;
          stroke-dashoffset: 0;
          stroke-dasharray: 0;
        }
        .scene-4 .connector-mapping-validation {
          stroke: #BF2D42;
          opacity: 1;
          animation: connector-flow 0.9s linear forwards;
        }
        .scene-4 .node-validation {
          opacity: 1;
          filter: saturate(1);
          transform: scale(1.02);
          border-color: rgba(191, 45, 66, 0.45) !important;
          box-shadow: 0 0 14px rgba(191, 45, 66, 0.1);
        }
        .scene-4 .validation-status { opacity: 1; color: #10B981; }
        .scene-4 .connector-validation-target {
          stroke: #BF2D42;
          opacity: 1;
          animation: connector-flow 0.9s linear 1.0s both;
        }
        .scene-4 .node-target {
          transform: scale(1.02);
          border-color: rgba(191, 45, 66, 0.4) !important;
          box-shadow: 0 0 16px rgba(191, 45, 66, 0.1);
        }

        /* ── Scene 5: Monitoring reveal (8.0–11.0s) — workflow stays visible ── */
        .scene-5 .connector-trigger-source,
        .scene-5 .connector-source-mapping {
          stroke: rgba(191, 45, 66, 0.15);
          opacity: 1;
          stroke-dasharray: 200 0;
        }
        .scene-5 .connector-mapping-validation,
        .scene-5 .connector-validation-target {
          stroke: rgba(191, 45, 66, 0.15);
          opacity: 1;
          stroke-dasharray: 200 0;
        }
        .scene-5 .node-mapping {
          border-color: rgba(14, 165, 233, 0.2) !important;
        }
        .scene-5 .mapping-line {
          stroke: rgba(14, 165, 233, 0.35);
          opacity: 0.5;
          stroke-dashoffset: 0;
          stroke-dasharray: 0;
        }
        .scene-5 .ai-chip { opacity: 0.4; }
        .scene-5 .transform-chip { opacity: 0.4; transform: scale(1); }
        .scene-5 .validation-status { opacity: 0.5; color: #10B981; }
        .scene-5 .monitor-card {
          transform: translateY(0) !important;
          opacity: 1 !important;
          box-shadow: 0 30px 60px -12px rgba(15,23,42,0.15);
        }
        .scene-5 .health-dot {
          animation: pulse-dot 0.9s ease-in-out 1;
        }
        .scene-5 .last-run-value {
          opacity: 1;
        }

        /* ── Scene 6: Monitor exits, overview resets (11.0–13.5s) ── */
        .scene-6 .monitor-card {
          opacity: 0 !important;
          transform: translateY(10px) !important;
          box-shadow: none;
        }
        .scene-6 .ambient-glow {
          opacity: 0.5;
        }
      `}</style>

      {/* Top Navigation */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-border-soft bg-surface px-6 lg:px-10 py-4 sticky top-0 z-50">
        <div className="flex items-center gap-3 text-text-main">
          <div className="size-6 text-primary">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_hero)">
                <path
                  clipRule="evenodd"
                  d="M47.2426 24L24 47.2426L0.757355 24L24 0.757355L47.2426 24ZM12.2426 21H35.7574L24 9.24264L12.2426 21Z"
                  fill="currentColor"
                  fillRule="evenodd"
                />
              </g>
              <defs>
                <clipPath id="clip0_hero">
                  <rect fill="white" height="48" width="48" />
                </clipPath>
              </defs>
            </svg>
          </div>
          <h2 className="text-text-main text-xl font-bold leading-tight tracking-[-0.015em]">
            Cogniviti Bridge
          </h2>
        </div>
        <div className="hidden md:flex flex-1 justify-end gap-8">
          <nav className="flex items-center gap-8">
            <a className="text-text-muted hover:text-primary transition-colors text-sm font-medium" href="#platform">Platform</a>
            <a className="text-text-muted hover:text-primary transition-colors text-sm font-medium" href="#solutions">Solutions</a>
            <a className="text-text-muted hover:text-primary transition-colors text-sm font-medium" href="#how-it-works">Resources</a>
            <a className="text-text-muted hover:text-primary transition-colors text-sm font-medium" href="#cta">Pricing</a>
          </nav>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="flex items-center justify-center rounded-lg h-10 px-5 bg-surface text-text-main border border-border-soft hover:bg-gray-50 transition-colors text-sm font-semibold"
            >
              Sign In
            </Link>
            <Link href="/support" className="flex items-center justify-center rounded-lg h-10 px-5 bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-semibold shadow-sm">
              Book a Demo
            </Link>
          </div>
        </div>
        <button className="md:hidden text-text-main">
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>
      </header>

      {/* Hero Section */}
      <main className="max-w-[1280px] mx-auto px-6 lg:px-10 min-h-[calc(100vh-73px)] flex items-center py-12 lg:py-20">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16 w-full">
          {/* Left Column */}
          <div className="w-full lg:w-[48%] flex flex-col gap-8 z-10">
            <div className="flex flex-col gap-4">
              <span className="text-text-muted text-xs font-bold uppercase tracking-tighter">
                Enterprise Integration Accelerator
              </span>
              <h1 className="text-text-main text-[40px] lg:text-[52px] font-bold leading-[1.1] tracking-[-0.025em]">
                Accelerate enterprise integrations{' '}
                <br className="hidden lg:block" />
                with <span className="text-primary">speed, structure, and control</span>
              </h1>
              <p className="text-text-muted text-[17px] font-normal leading-[1.5] max-w-[480px]">
                Cogniviti Bridge helps teams design, configure, deploy, and monitor enterprise
                integrations faster through structured workflows, reusable templates, AI-assisted
                mappings, and controlled Dev-to-Prod promotion.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Link href="/support" className="w-full sm:w-[170px] h-[52px] rounded-lg bg-primary text-white text-[15px] font-semibold flex items-center justify-center shadow-soft hover:bg-primary/90 transition-all">
                Book a Demo
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-[190px] h-[52px] rounded-lg bg-surface text-text-main border border-border-subtle text-[15px] font-semibold flex items-center justify-center shadow-sm hover:bg-gray-50 transition-all"
              >
                Explore the Product
              </Link>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-[13px] text-text-main font-medium">
                Built for structured enterprise integrations across SaaS and ERP systems
              </p>
            </div>
          </div>

          {/* Right Column: Workflow Animation */}
          <div className="w-full lg:w-[52%] relative lg:pr-12">
            <WorkflowAnimation />
          </div>
        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Section 2: Why Cogniviti Bridge                                    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section id="platform" className="bg-surface py-24 lg:py-32">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="max-w-[720px] mx-auto text-center mb-16">
            <h2 className="text-text-main text-[32px] lg:text-[40px] font-bold leading-[1.15] tracking-[-0.02em] mb-5">
              A structured way to deliver enterprise integrations faster
            </h2>
            <p className="text-text-muted text-[16px] leading-[1.6]">
              Cogniviti Bridge is an integration accelerator built to simplify repeatable enterprise
              integrations across SaaS, ERP, and other business systems. Instead of building every
              workflow from scratch, teams work through guided templates, approved mappings, reusable
              transformations, and controlled release processes.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: 'design_services',
                title: 'Design with structure',
                copy: 'Use guided workflows and editable integration blocks instead of starting from a blank canvas.',
              },
              {
                icon: 'rocket_launch',
                title: 'Deploy with control',
                copy: 'Promote integrations cleanly across Dev, Test, and Prod with approvals and bounded environment overrides.',
              },
              {
                icon: 'monitoring',
                title: 'Operate with visibility',
                copy: 'Track health, runs, failures, replays, and operational KPIs from one workspace.',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-background-light rounded-xl p-8 border border-border-soft"
              >
                <div className="w-11 h-11 rounded-lg bg-primary/5 flex items-center justify-center text-primary mb-5">
                  <span className="material-symbols-outlined text-[22px]">{card.icon}</span>
                </div>
                <h3 className="text-text-main text-lg font-semibold mb-2">{card.title}</h3>
                <p className="text-text-muted text-[15px] leading-[1.6]">{card.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Section 3: How It Works                                            */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-background-light py-24 lg:py-32">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <h2 className="text-center text-text-main text-[32px] lg:text-[40px] font-bold leading-[1.15] tracking-[-0.02em] mb-16">
            From setup to go-live in a guided workflow
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-0">
            {[
              {
                step: '01',
                icon: 'description',
                title: 'Choose a template',
                copy: 'Start with a certified business template or a technical starter template such as REST to REST, REST to DB, or file to ERP.',
              },
              {
                step: '02',
                icon: 'settings_input_component',
                title: 'Configure systems',
                copy: 'Set up source and target connections, authentication, triggers, and environment-specific bindings.',
              },
              {
                step: '03',
                icon: 'schema',
                title: 'Review mappings and rules',
                copy: 'Approve AI-assisted field mappings, add transformations, and apply business rules through a structured workflow.',
              },
              {
                step: '04',
                icon: 'verified',
                title: 'Test and promote',
                copy: 'Validate changes in Dev, promote to Test, and then publish to Prod through controlled release flows.',
              },
              {
                step: '05',
                icon: 'insights',
                title: 'Monitor and improve',
                copy: 'Track run status, failures, health, replays, and operational KPIs after go-live.',
              },
            ].map((s, i) => (
              <div key={s.step} className="relative flex flex-col items-center text-center px-4 py-6">
                {i < 4 && (
                  <div className="hidden md:block absolute top-10 left-[calc(50%+28px)] w-[calc(100%-56px)] h-px bg-border-soft" />
                )}
                <div className="w-14 h-14 rounded-full bg-primary/5 flex items-center justify-center text-primary mb-4 relative z-10">
                  <span className="material-symbols-outlined text-[24px]">{s.icon}</span>
                </div>
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">
                  Step {s.step}
                </span>
                <h3 className="text-text-main text-[15px] font-semibold mb-2">{s.title}</h3>
                <p className="text-text-muted text-[13px] leading-[1.6]">{s.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Section 4: Core Capabilities                                       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="bg-surface py-24 lg:py-32">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <h2 className="text-center text-text-main text-[32px] lg:text-[40px] font-bold leading-[1.15] tracking-[-0.02em] mb-5">
            Built for integration teams that need speed without losing control
          </h2>
          <p className="text-center text-text-muted text-[16px] leading-[1.6] max-w-[600px] mx-auto mb-16">
            Every module is designed to reduce time-to-delivery while keeping enterprise governance intact.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: 'account_tree', title: 'Structured Workflow Designer', copy: 'Connected editable boxes instead of a blank-canvas builder.' },
              { icon: 'library_books', title: 'Certified & Starter Templates', copy: 'Use business templates or technical starter patterns to accelerate delivery.' },
              { icon: 'settings_ethernet', title: 'Connection Setup & Testing', copy: 'Configure REST, file, DB, object storage, webhook, and scheduler-based integrations.' },
              { icon: 'auto_awesome', title: 'AI-assisted Mapping', copy: 'Speed up field mapping with human-reviewed suggestions grounded in approved documentation.' },
              { icon: 'transform', title: 'Reusable Transformations', copy: 'Apply built-in and domain-specific transforms through a controlled mapping layer.' },
              { icon: 'rule', title: 'Business Rules & Validation', copy: 'Add thresholds, conditions, approvals, validations, and routing logic without writing everything from scratch.' },
              { icon: 'publish', title: 'Release & Promotion Flow', copy: 'Manage Dev, Test, and Prod through versioned artifacts and approvals.' },
              { icon: 'replay', title: 'Monitoring & Replay', copy: 'Track failures, status, replay items, health, and operational metrics from one place.' },
            ].map((c) => (
              <div
                key={c.title}
                className="bg-background-light rounded-xl p-6 border border-border-soft flex flex-col gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">{c.icon}</span>
                </div>
                <h3 className="text-text-main text-[15px] font-semibold">{c.title}</h3>
                <p className="text-text-muted text-[14px] leading-[1.6]">{c.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Section 5: Templates & Use Cases                                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section id="solutions" className="bg-background-light py-24 lg:py-32">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="max-w-[720px] mx-auto text-center mb-16">
            <h2 className="text-text-main text-[32px] lg:text-[40px] font-bold leading-[1.15] tracking-[-0.02em] mb-5">
              Designed for repeatable enterprise integration scenarios
            </h2>
            <p className="text-text-muted text-[16px] leading-[1.6]">
              Start from proven templates for common business flows or use controlled starter
              templates for broader system patterns.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Certified Business Templates */}
            <div className="bg-surface rounded-xl p-8 border border-border-soft">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">verified</span>
                </div>
                <h3 className="text-text-main text-lg font-semibold">Certified Business Templates</h3>
              </div>
              <ul className="flex flex-col gap-3">
                {[
                  'Coupa Invoice to SAP Invoice',
                  'Coupa Purchase Order to SAP Purchase Document',
                  'Vendor sync to ERP',
                  'GEP to ERP invoice flow',
                  'Payment status sync',
                ].map((t) => (
                  <li key={t} className="flex items-center gap-3 text-[14px] text-text-muted">
                    <span className="material-symbols-outlined text-success text-[18px]">check_circle</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            {/* Technical Starter Templates */}
            <div className="bg-surface rounded-xl p-8 border border-border-soft">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-accent-blue/10 flex items-center justify-center text-accent-blue">
                  <span className="material-symbols-outlined text-[20px]">code</span>
                </div>
                <h3 className="text-text-main text-lg font-semibold">Technical Starter Templates</h3>
              </div>
              <ul className="flex flex-col gap-3">
                {[
                  'REST to REST',
                  'REST to DB',
                  'DB to REST',
                  'File to REST',
                  'REST to File',
                  'S3 / File to API',
                ].map((t) => (
                  <li key={t} className="flex items-center gap-3 text-[14px] text-text-muted">
                    <span className="material-symbols-outlined text-accent-blue text-[18px]">terminal</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-center text-text-muted text-[14px] mt-8">
            Cogniviti Bridge keeps the workflow structured even when the integration pattern is generic.
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Section 6: Governance & Dev-to-Prod Control                        */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="bg-surface py-24 lg:py-32">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="max-w-[720px] mx-auto text-center mb-16">
            <h2 className="text-text-main text-[32px] lg:text-[40px] font-bold leading-[1.15] tracking-[-0.02em] mb-5">
              Built-in governance from Dev to Prod
            </h2>
            <p className="text-text-muted text-[16px] leading-[1.6]">
              Cogniviti Bridge separates structural changes from environment-specific operational
              settings, helping teams keep workflows aligned across Dev, Test, and Prod.
            </p>
          </div>
          <div className="flex flex-col lg:flex-row gap-12 items-start">
            {/* Left: Environment descriptions */}
            <div className="w-full lg:w-1/2 flex flex-col gap-6">
              {[
                {
                  env: 'Dev',
                  color: 'text-accent-blue',
                  bg: 'bg-accent-blue/5',
                  copy: 'Edit workflow structure, mappings, transforms, and business rules.',
                },
                {
                  env: 'Test / UAT',
                  color: 'text-warning',
                  bg: 'bg-warning/5',
                  copy: 'Validate approved artifacts with environment-specific operational settings.',
                },
                {
                  env: 'Prod',
                  color: 'text-success',
                  bg: 'bg-success/5',
                  copy: 'Run approved releases with bounded overrides such as credentials, endpoints, schedules, and alerts.',
                },
              ].map((e) => (
                <div key={e.env} className="flex items-start gap-4">
                  <div className={`w-10 h-10 shrink-0 rounded-lg ${e.bg} flex items-center justify-center ${e.color} font-bold text-[13px]`}>
                    {e.env.slice(0, 1)}
                  </div>
                  <div>
                    <h3 className="text-text-main text-[15px] font-semibold mb-1">{e.env}</h3>
                    <p className="text-text-muted text-[14px] leading-[1.6]">{e.copy}</p>
                  </div>
                </div>
              ))}
              <ul className="flex flex-col gap-2 mt-4 pl-14">
                {[
                  'Structural edits only in Dev',
                  'Controlled promotion to Test and Prod',
                  'Bounded environment overrides',
                  'Reduced drift between environments',
                ].map((b) => (
                  <li key={b} className="flex items-center gap-2 text-[13px] text-text-muted">
                    <span className="material-symbols-outlined text-success text-[16px]">check</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            {/* Right: Environment flow visual */}
            <div className="w-full lg:w-1/2">
              <div className="bg-background-light rounded-xl border border-border-soft p-8">
                <div className="flex items-center justify-between gap-4 mb-8">
                  {['Dev', 'Test', 'Prod'].map((env, i) => (
                    <div key={env} className="flex items-center gap-3 flex-1">
                      <div className={`w-full rounded-lg py-3 text-center text-[13px] font-semibold border ${
                        env === 'Dev'
                          ? 'bg-accent-blue/5 border-accent-blue/20 text-accent-blue'
                          : env === 'Test'
                            ? 'bg-warning/5 border-warning/20 text-warning'
                            : 'bg-success/5 border-success/20 text-success'
                      }`}>
                        {env}
                      </div>
                      {i < 2 && (
                        <span className="material-symbols-outlined text-text-muted text-[18px] shrink-0">
                          arrow_forward
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Approval checkpoint', 'Release artifact', 'Endpoint override', 'Cron override', 'Credentials'].map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full bg-surface border border-border-soft text-[11px] font-medium text-text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Section 7: Monitoring & Operational Visibility                     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="bg-background-light py-24 lg:py-32">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="max-w-[720px] mx-auto text-center mb-16">
            <h2 className="text-text-main text-[32px] lg:text-[40px] font-bold leading-[1.15] tracking-[-0.02em] mb-5">
              Operational visibility built into the workflow lifecycle
            </h2>
            <p className="text-text-muted text-[16px] leading-[1.6]">
              Cogniviti Bridge does not stop at deployment. Teams can monitor integration health,
              track failures, replay items, and surface operational KPIs without building separate
              manual reports.
            </p>
          </div>
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            {/* Left: KPI cards mockup */}
            <div className="w-full lg:w-1/2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Healthy', value: '12', color: 'text-success' },
                  { label: 'Failed Runs', value: '3', color: 'text-danger' },
                  { label: 'Replay Queue', value: '7', color: 'text-warning' },
                  { label: 'Success Rate', value: '96.4%', color: 'text-success' },
                  { label: 'Last Run', value: '2m ago', color: 'text-text-main' },
                  { label: 'Avg / Day', value: '48', color: 'text-accent-blue' },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="bg-surface rounded-xl p-5 border border-border-soft text-center"
                  >
                    <p className={`text-[24px] font-bold ${kpi.color}`}>{kpi.value}</p>
                    <p className="text-[12px] text-text-muted font-medium mt-1">{kpi.label}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Right: Benefit list */}
            <div className="w-full lg:w-1/2 flex flex-col gap-4">
              {[
                { icon: 'visibility', text: 'Run-level visibility into every integration execution' },
                { icon: 'bug_report', text: 'Item-level failure tracking with root cause context' },
                { icon: 'health_and_safety', text: 'Health snapshots across all active integrations' },
                { icon: 'replay', text: 'Replay support for failed or incomplete items' },
                { icon: 'bar_chart', text: 'Quick KPI reporting for stakeholders and ops teams' },
              ].map((b) => (
                <div key={b.text} className="flex items-start gap-3">
                  <div className="w-9 h-9 shrink-0 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[18px]">{b.icon}</span>
                  </div>
                  <p className="text-text-muted text-[14px] leading-[1.6] pt-2">{b.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Section 8: Final CTA                                               */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section id="cta" className="bg-[#0F172A] py-24 lg:py-28">
        <div className="max-w-[720px] mx-auto px-6 lg:px-10 text-center">
          <h2 className="text-white text-[32px] lg:text-[40px] font-bold leading-[1.15] tracking-[-0.02em] mb-5">
            Accelerate enterprise integrations with more structure and less effort
          </h2>
          <p className="text-slate-400 text-[16px] leading-[1.6] mb-10">
            Cogniviti Bridge helps teams move faster from design to deployment while keeping
            enterprise controls intact.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/support" className="w-full sm:w-[170px] h-[52px] rounded-lg bg-primary text-white text-[15px] font-semibold flex items-center justify-center shadow-soft hover:bg-primary/90 transition-all">
              Book a Demo
            </Link>
            <Link href="/support" className="w-full sm:w-[170px] h-[52px] rounded-lg bg-white/10 text-white border border-white/20 text-[15px] font-semibold flex items-center justify-center hover:bg-white/15 transition-all">
              Talk to Us
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Footer                                                             */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <footer className="bg-[#0F172A] border-t border-slate-800 py-16">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 lg:gap-16 mb-12">
            {/* Brand column */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 text-white mb-4">
                <div className="size-5 text-primary">
                  <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path
                      clipRule="evenodd"
                      d="M47.2426 24L24 47.2426L0.757355 24L24 0.757355L47.2426 24ZM12.2426 21H35.7574L24 9.24264L12.2426 21Z"
                      fill="currentColor"
                      fillRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="text-[15px] font-bold">Cogniviti Bridge</span>
              </div>
              <p className="text-slate-500 text-[13px] leading-[1.6]">
                An enterprise integration accelerator built for structured workflows, controlled
                delivery, and operational visibility.
              </p>
            </div>
            {/* Product */}
            <div>
              <h4 className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-4">Product</h4>
              <ul className="flex flex-col gap-2.5">
                {[
                  { label: 'Platform', href: '#platform' },
                  { label: 'Solutions', href: '#solutions' },
                  { label: 'Pricing', href: '#cta' },
                  { label: 'Sign In', href: '/login' },
                ].map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="text-slate-500 hover:text-white transition-colors text-[13px]">{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>
            {/* Resources */}
            <div>
              <h4 className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-4">Resources</h4>
              <ul className="flex flex-col gap-2.5">
                {[
                  { label: 'Documentation', href: '/docs' },
                  { label: 'Use Cases', href: '#solutions' },
                  { label: 'Contact', href: '/support' },
                  { label: 'Request Access', href: '/login' },
                ].map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="text-slate-500 hover:text-white transition-colors text-[13px]">{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>
            {/* Company */}
            <div>
              <h4 className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-4">Company</h4>
              <ul className="flex flex-col gap-2.5">
                {[
                  { label: 'Cogniviti Labs', href: '/' },
                  { label: 'Privacy Policy', href: '/privacy' },
                  { label: 'Terms of Service', href: '/terms' },
                ].map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="text-slate-500 hover:text-white transition-colors text-[13px]">{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-600 text-[12px]">&copy; {new Date().getFullYear()} Cogniviti Labs. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="/privacy" className="text-slate-600 hover:text-slate-400 transition-colors text-[12px]">Privacy</a>
              <a href="/terms" className="text-slate-600 hover:text-slate-400 transition-colors text-[12px]">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Workflow Animation Component ─── */

function WorkflowAnimation() {
  const [scene, setScene] = useState(1);

  useEffect(() => {
    // Scene durations in ms (~13.5s + 0.5s pause = 14s loop):
    // 1) Calm overview        0.0 – 1.8s  (1800ms)
    // 2) Source activation     1.8 – 3.2s  (1400ms)
    // 3) Mapping & transform   3.2 – 6.0s  (2800ms)
    // 4) Validation + delivery 6.0 – 8.0s  (2000ms)
    // 5) Monitoring reveal      8.0 – 11.0s (3000ms)
    // 6) Monitor exits, reset  11.0 – 13.5s (2500ms)
    const durations = [1800, 1400, 2800, 2000, 3000, 2500];
    let currentScene = 0;
    let timeout: NodeJS.Timeout;

    const advance = () => {
      currentScene = (currentScene + 1) % durations.length;
      setScene(currentScene + 1);
      timeout = setTimeout(advance, durations[currentScene]);
    };

    timeout = setTimeout(advance, durations[0]);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className={`scene-${scene} relative bg-white/60 rounded-lg p-8 lg:p-12 border border-border-soft shadow-inner overflow-hidden group cursor-default`}>
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 ambient-glow" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-blue/5 rounded-full blur-3xl -ml-20 -mb-20 ambient-glow" />

      {/* Workflow Nodes */}
      <div className="relative z-20 flex flex-col gap-10 lg:pr-0 xl:pr-10">
        {/* Top Row: Trigger & Source */}
        <div className="flex justify-between items-center relative gap-3 xl:gap-6">
          {/* Trigger */}
          <div className="workflow-node node-trigger w-[150px] xl:w-[180px] bg-surface rounded-lg p-3 xl:p-4 shadow-floating border border-border-soft flex items-center gap-2 xl:gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-text-muted">
              <span className="material-symbols-outlined text-lg">bolt</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Trigger</span>
              <span className="text-[13px] font-semibold text-text-main">Schedule</span>
            </div>
          </div>

          {/* Connector */}
          <svg
            className="absolute top-1/2 left-[150px] xl:left-[180px] w-[calc(100%-300px)] xl:w-[calc(100%-360px)] h-4 -translate-y-1/2"
            preserveAspectRatio="none"
            viewBox="0 0 100 4"
          >
            <line className="connector-path connector-trigger-source" strokeWidth="3" x1="0" x2="100" y1="2" y2="2" />
          </svg>

          {/* Source */}
          <div className="workflow-node node-source w-[150px] xl:w-[180px] bg-surface rounded-lg p-3 xl:p-4 shadow-floating border border-border-soft flex items-center gap-2 xl:gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/5 flex items-center justify-center text-primary source-icon-pulse">
              <span className="material-symbols-outlined text-lg">database</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Source</span>
              <span className="text-[13px] font-semibold text-text-main">Source Connection</span>
            </div>
          </div>
        </div>

        {/* Middle Row: Mapping */}
        <div className="flex justify-center relative py-2">
          <svg
            className="absolute -top-10 left-0 w-full h-[calc(100%+80px)] pointer-events-none"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
            overflow="visible"
          >
            <path
              className="connector-path connector-source-mapping"
              d="M86 0 L86 50 L76 50"
              fill="none"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />
            <path
              className="connector-path connector-mapping-validation"
              d="M24 50 L14 50 L14 108"
              fill="none"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Mapping Node */}
          <div className="workflow-node node-mapping w-[220px] xl:w-[260px] bg-surface rounded-lg p-4 xl:p-5 shadow-floating border border-border-soft flex items-start gap-3 xl:gap-4 relative overflow-hidden">
            <div className="ai-chip absolute top-0 right-0 bg-ai-bg text-ai text-[9px] font-bold px-2 py-1 rounded-bl-md flex items-center gap-1">
              <span className="material-symbols-outlined text-[10px]">auto_awesome</span>
              AI MAPPED
            </div>
            <div className="w-10 h-10 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue shrink-0">
              <span className="material-symbols-outlined text-xl">schema</span>
            </div>
            <div className="flex flex-col w-full">
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-1">Transform</span>
              <span className="text-[14px] font-semibold text-text-main mb-3">Mapping &amp; Transform</span>

              {/* Visual Mapping Lines */}
              <div className="flex flex-col gap-3 p-3 bg-gray-50/50 rounded-md border border-gray-100 relative">
                <div className="flex items-center justify-between relative">
                  <div className="h-1.5 w-14 bg-gray-200 rounded-full" />
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                    <line className="mapping-line" strokeWidth="1.5" x1="30%" x2="70%" y1="50%" y2="50%" />
                  </svg>
                  <div className="h-1.5 w-10 bg-accent-blue/30 rounded-full" />
                </div>
                <div className="flex items-center justify-between relative">
                  <div className="h-1.5 w-10 bg-gray-200 rounded-full" />
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                    <line className="mapping-line" strokeWidth="1.5" x1="25%" x2="75%" y1="50%" y2="50%" />
                  </svg>
                  <div className="transform-chip px-1.5 py-0.5 bg-accent-blue/10 rounded text-[8px] text-accent-blue font-bold">
                    DATE FORMAT
                  </div>
                  <div className="h-1.5 w-12 bg-accent-blue/30 rounded-full" />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Row: Validation & Target */}
        <div className="flex justify-between items-center relative gap-3 xl:gap-6">
          {/* Validation */}
          <div className="workflow-node node-validation w-[150px] xl:w-[180px] bg-surface rounded-lg p-3 xl:p-4 shadow-floating border border-border-soft flex items-center gap-2 xl:gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
              <span className="material-symbols-outlined text-lg">rule</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Validation</span>
              <span className="validation-status text-[11px] font-bold text-success line-clamp-1">APPROVED</span>
            </div>
          </div>

          {/* Connector */}
          <svg
            className="absolute top-1/2 left-[150px] xl:left-[180px] w-[calc(100%-300px)] xl:w-[calc(100%-360px)] h-4 -translate-y-1/2"
            preserveAspectRatio="none"
            viewBox="0 0 100 4"
          >
            <line className="connector-path connector-validation-target" strokeWidth="3" x1="0" x2="100" y1="2" y2="2" />
          </svg>

          {/* Target */}
          <div className="workflow-node node-target w-[150px] xl:w-[180px] bg-surface rounded-lg p-3 xl:p-4 shadow-floating border border-border-soft flex items-center gap-2 xl:gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-slate-800">
              <span className="material-symbols-outlined text-lg">dns</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Target</span>
              <span className="text-[13px] font-semibold text-text-main">Target Connection</span>
            </div>
          </div>
        </div>
      </div>

      {/* Monitoring Overlay Card */}
      <div className="monitor-card hidden xl:block absolute z-30 w-[200px] backdrop-blur-md rounded-lg p-4 border border-border-soft shadow-monitor bottom-3 right-4 bg-white/90 opacity-0 transition-all duration-700 transform translate-y-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">Active Monitor</span>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-success health-dot" />
            <span className="text-[10px] font-bold text-success">Healthy</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-text-muted">Integration</span>
            <span className="text-[11px] font-bold text-text-main">Source → Target</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-text-muted">Last Run</span>
            <span className="text-[11px] font-medium text-text-main last-run-value">2m ago</span>
          </div>
        </div>
      </div>

      {/* Non-overlay card on lg to avoid node collisions */}
      <div className="monitor-card hidden lg:block xl:hidden mt-4 rounded-lg p-4 border border-border-soft shadow-monitor bg-white/90 opacity-0 transition-all duration-700 transform translate-y-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">Active Monitor</span>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-success health-dot" />
            <span className="text-[10px] font-bold text-success">Healthy</span>
          </div>
        </div>
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-text-muted">Source → Target</span>
          <span className="text-text-main font-semibold last-run-value">2m ago</span>
        </div>
      </div>

      {/* Mobile Fallback */}
      <div className="absolute inset-0 bg-background-light z-30 flex lg:hidden items-center justify-center p-6 rounded-lg">
        <div className="w-full h-full border-2 border-dashed border-border-soft rounded-lg flex flex-col items-center justify-center gap-4 text-text-muted bg-surface/50">
          <span className="material-symbols-outlined text-4xl text-primary/50">account_tree</span>
          <p className="text-sm font-medium text-center px-4">
            Interactive workflow visualization available on desktop.
          </p>
        </div>
      </div>
    </div>
  );
}
