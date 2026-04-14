import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background-light flex flex-col">
      <header className="h-16 flex items-center px-6 border-b border-border-soft bg-surface">
        <Link href="/login" className="flex items-center gap-2.5 text-text-main">
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
          <span className="text-[15px] font-bold tracking-[-0.015em]">Cogniviti Bridge</span>
        </Link>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-text-main mb-6">Terms of Service</h1>
        <div className="prose prose-slate prose-sm max-w-none space-y-4 text-text-muted">
          <p className="text-sm"><em>Last updated: April 2026</em></p>

          <h2 className="text-lg font-semibold text-text-main mt-8">1. Acceptance of Terms</h2>
          <p>By accessing or using Cogniviti Bridge, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.</p>

          <h2 className="text-lg font-semibold text-text-main mt-8">2. Description of Service</h2>
          <p>Cogniviti Bridge is an integration accelerator platform that enables users to design, build, test, and manage data integration workflows between enterprise systems.</p>

          <h2 className="text-lg font-semibold text-text-main mt-8">3. User Accounts</h2>
          <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Notify the administrator immediately of any unauthorized use.</p>

          <h2 className="text-lg font-semibold text-text-main mt-8">4. Acceptable Use</h2>
          <p>You agree not to misuse the platform, including but not limited to: attempting unauthorized access, interfering with service operations, or using the platform for unlawful purposes.</p>

          <h2 className="text-lg font-semibold text-text-main mt-8">5. Data &amp; Integrations</h2>
          <p>You retain ownership of your integration configurations and data. Cogniviti Bridge processes data solely to provide the integration services you configure.</p>

          <h2 className="text-lg font-semibold text-text-main mt-8">6. Limitation of Liability</h2>
          <p>The platform is provided &quot;as is&quot; without warranties of any kind. Cogniviti Labs shall not be liable for any data loss, integration failures, or downstream system impacts.</p>

          <h2 className="text-lg font-semibold text-text-main mt-8">7. Changes to Terms</h2>
          <p>We may update these terms at any time. Continued use of the platform after changes constitutes acceptance of the revised terms.</p>
        </div>

        <div className="mt-12 pt-6 border-t border-border-soft">
          <Link href="/login" className="text-sm text-primary hover:underline">&larr; Back to Login</Link>
        </div>
      </main>
    </div>
  );
}
