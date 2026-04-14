import Link from 'next/link';

export default function PrivacyPage() {
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
        <h1 className="text-2xl font-bold text-text-main mb-6">Privacy Policy</h1>
        <div className="prose prose-slate prose-sm max-w-none space-y-4 text-text-muted">
          <p className="text-sm"><em>Last updated: April 2026</em></p>

          <h2 className="text-lg font-semibold text-text-main mt-8">1. Information We Collect</h2>
          <p>Cogniviti Bridge collects only the information necessary to provide integration services: your email address, name, and the integration configurations you create.</p>

          <h2 className="text-lg font-semibold text-text-main mt-8">2. How We Use Information</h2>
          <p>We use your information solely to authenticate your access, execute your configured integrations, and provide platform functionality. We do not sell or share your data with third parties.</p>

          <h2 className="text-lg font-semibold text-text-main mt-8">3. Data Storage</h2>
          <p>All data is stored in the self-hosted PostgreSQL database configured by your administrator. Integration payloads are processed transiently and retained only as configured in your workflow settings.</p>

          <h2 className="text-lg font-semibold text-text-main mt-8">4. Security</h2>
          <p>Passwords are hashed using bcrypt. Authentication uses signed JWT tokens transmitted via httpOnly cookies. All API endpoints are protected by role-based access controls.</p>

          <h2 className="text-lg font-semibold text-text-main mt-8">5. Data Retention</h2>
          <p>Integration run logs and audit trails are retained per your workspace configuration. You may request deletion of your account and associated data by contacting your administrator.</p>

          <h2 className="text-lg font-semibold text-text-main mt-8">6. Cookies</h2>
          <p>We use strictly necessary httpOnly cookies for authentication (access and refresh tokens). No tracking or analytics cookies are used.</p>

          <h2 className="text-lg font-semibold text-text-main mt-8">7. Changes to This Policy</h2>
          <p>We may update this policy periodically. Changes will be reflected by the &quot;Last updated&quot; date above.</p>
        </div>

        <div className="mt-12 pt-6 border-t border-border-soft">
          <Link href="/login" className="text-sm text-primary hover:underline">&larr; Back to Login</Link>
        </div>
      </main>
    </div>
  );
}
