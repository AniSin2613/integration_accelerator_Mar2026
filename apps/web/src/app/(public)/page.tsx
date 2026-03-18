'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function HeroPage() {
  return (
    <div className="bg-background-light font-display min-h-screen text-text-main overflow-x-hidden">
      {/* Hero Animation Styles */}
      <style jsx global>{`
        .workflow-node {
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.4s ease, border-color 0.4s ease;
        }
        .ambient-glow {
          opacity: 0.4;
          transition: opacity 1s ease;
        }
        .connector-path {
          stroke: #CBD5E1;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 6 8;
          opacity: 0.9;
          transition: stroke 0.3s ease, opacity 0.3s ease;
        }
        .mapping-line {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          opacity: 0.3;
        }
        .ai-chip, .transform-chip, .validation-status {
          opacity: 0;
          transition: all 0.3s ease;
        }
        .transform-chip { transform: scale(0.8); }
        @keyframes connector-flow {
          0% { stroke-dasharray: 0 200; stroke-dashoffset: 0; }
          100% { stroke-dasharray: 200 0; stroke-dashoffset: 0; }
        }
        @keyframes pulse-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
        }
        /* Use JS-driven classes for scene transitions */
        .scene-1 .node-trigger {
          transform: scale(1.03);
          border-color: #BF2D42 !important;
          box-shadow: 0 0 20px rgba(191, 45, 66, 0.2);
        }
        .scene-2 .connector-trigger-source {
          stroke: #BF2D42;
          opacity: 1;
          animation: connector-flow 0.9s linear forwards;
        }
        .scene-3 .node-source {
          transform: scale(1.03);
          border-color: #BF2D42 !important;
          box-shadow: 0 0 20px rgba(191, 45, 66, 0.2);
        }
        .scene-4 .connector-source-mapping {
          stroke: #BF2D42;
          opacity: 1;
          animation: connector-flow 0.9s linear forwards;
        }
        .scene-5 .node-mapping {
          transform: scale(1.03);
          border-color: #0EA5E9 !important;
          box-shadow: 0 0 30px rgba(14, 165, 233, 0.2);
        }
        .scene-5 .mapping-line {
          stroke: #0EA5E9;
          opacity: 1;
          stroke-dashoffset: 0;
          transition: stroke-dashoffset 2s ease-in-out;
        }
        .scene-5 .ai-chip { opacity: 1; transform: translateY(0); }
        .scene-5 .transform-chip { opacity: 1; transform: scale(1); }
        .scene-6 .connector-mapping-validation {
          stroke: #BF2D42;
          opacity: 1;
          animation: connector-flow 0.9s linear forwards;
        }
        .scene-7 .node-validation {
          transform: scale(1.03);
          background: #fffafa;
          border-color: #BF2D42 !important;
        }
        .scene-7 .validation-status { opacity: 1; color: #10B981; }
        .scene-8 .connector-validation-target {
          stroke: #BF2D42;
          opacity: 1;
          animation: connector-flow 0.9s linear forwards;
        }
        .scene-9 .node-target {
          transform: scale(1.05);
          background: #fffafa;
          border-color: #BF2D42 !important;
          box-shadow: 0 0 28px rgba(191, 45, 66, 0.22);
        }
        .scene-10 .monitor-card {
          transform: translateY(0) !important;
          opacity: 1 !important;
          box-shadow: 0 30px 60px -12px rgba(15,23,42,0.15);
        }
        .scene-10 .health-dot {
          animation: pulse-dot 1s ease-in-out infinite;
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
            <a className="text-text-muted hover:text-primary transition-colors text-sm font-medium" href="#">Platform</a>
            <a className="text-text-muted hover:text-primary transition-colors text-sm font-medium" href="#">Solutions</a>
            <a className="text-text-muted hover:text-primary transition-colors text-sm font-medium" href="#">Resources</a>
            <a className="text-text-muted hover:text-primary transition-colors text-sm font-medium" href="#">Pricing</a>
          </nav>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="flex items-center justify-center rounded-lg h-10 px-5 bg-surface text-text-main border border-border-soft hover:bg-gray-50 transition-colors text-sm font-semibold"
            >
              Sign In
            </Link>
            <button className="flex items-center justify-center rounded-lg h-10 px-5 bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-semibold shadow-sm">
              Book a Demo
            </button>
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
              <button className="w-full sm:w-[170px] h-[52px] rounded-lg bg-primary text-white text-[15px] font-semibold flex items-center justify-center shadow-soft hover:bg-primary/90 transition-all">
                Book a Demo
              </button>
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
    </div>
  );
}

/* ─── Workflow Animation Component ─── */

function WorkflowAnimation() {
  const [scene, setScene] = useState(1);

  useEffect(() => {
    // Scene durations in ms: Sequential flow - node, connector, node, connector...
    // Connector scenes are intentionally longer so travel is clearly visible.
    const durations = [900, 900, 900, 900, 1400, 900, 1100, 1200, 1200, 1500];
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
            <div className="w-9 h-9 rounded-full bg-primary/5 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-lg">database</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Source</span>
              <span className="text-[13px] font-semibold text-text-main">ERP System</span>
            </div>
          </div>
        </div>

        {/* Middle Row: Mapping */}
        <div className="flex justify-center relative py-2">
          <svg
            className="absolute -top-10 left-0 w-full h-[calc(100%+80px)] pointer-events-none"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
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
              d="M24 50 L14 50 L14 100"
              fill="none"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Mapping Node */}
          <div className="workflow-node node-mapping w-[220px] xl:w-[260px] bg-surface rounded-lg p-4 xl:p-5 shadow-floating border border-border-soft flex items-start gap-3 xl:gap-4 relative overflow-hidden">
            <div className="ai-chip absolute top-0 right-0 bg-accent-blue/10 text-accent-blue text-[9px] font-bold px-2 py-1 rounded-bl-md flex items-center gap-1">
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
            <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
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
              <span className="text-[13px] font-semibold text-text-main">SaaS Platform</span>
            </div>
          </div>
        </div>
      </div>

      {/* Monitoring Overlay Card */}
      <div className="monitor-card hidden xl:block absolute z-30 w-[190px] backdrop-blur-md rounded-lg p-3 border border-border-soft shadow-monitor bottom-3 right-4 bg-white/90 opacity-0 transition-all duration-700 transform translate-y-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">Active Monitor</span>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-success health-dot" />
            <span className="text-[10px] font-bold text-success">Healthy</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-text-muted">Integration</span>
            <span className="text-[11px] font-bold text-text-main">SAP to Salesforce</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-text-muted">Last Run</span>
            <span className="text-[11px] font-medium text-text-main">2m ago</span>
          </div>
        </div>
      </div>

      {/* Non-overlay card on lg to avoid node collisions */}
      <div className="monitor-card hidden lg:block xl:hidden mt-4 rounded-lg p-3 border border-border-soft shadow-monitor bg-white/90 opacity-0 transition-all duration-700 transform translate-y-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">Active Monitor</span>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-success health-dot" />
            <span className="text-[10px] font-bold text-success">Healthy</span>
          </div>
        </div>
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-text-muted">SAP to Salesforce</span>
          <span className="text-text-main font-semibold">2m ago</span>
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
