'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Stub authentication — accepts any non-empty credentials
    if (!email || !password) {
      setError('Please enter your email and password.');
      setLoading(false);
      return;
    }

    // Simulate a brief network delay
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);

    // Navigate to the dashboard
    router.push('/dashboard');
  };

  return (
    <div className="bg-background-light font-display min-h-screen text-text-main flex flex-col">
      {/* Minimal Header */}
      <header className="flex items-center border-b border-border-soft bg-surface px-6 lg:px-10 py-4">
        <Link href="/" className="flex items-center gap-3 text-text-main">
          <div className="size-6 text-primary">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_login)">
                <path
                  clipRule="evenodd"
                  d="M47.2426 24L24 47.2426L0.757355 24L24 0.757355L47.2426 24ZM12.2426 21H35.7574L24 9.24264L12.2426 21Z"
                  fill="currentColor"
                  fillRule="evenodd"
                />
              </g>
              <defs>
                <clipPath id="clip0_login">
                  <rect fill="white" height="48" width="48" />
                </clipPath>
              </defs>
            </svg>
          </div>
          <h2 className="text-text-main text-xl font-bold leading-tight tracking-[-0.015em]">
            Cogniviti Bridge
          </h2>
        </Link>
      </header>

      {/* Login Form */}
      <main className="flex-1 flex items-center justify-center px-6 pt-8 pb-20">
        <div className="w-full max-w-[425px]">
          <div className="bg-surface rounded-xl border border-slate-200/60 shadow-soft p-9 sm:p-10">
            <div className="text-center mb-5">
              <h1 className="text-[22px] font-bold text-text-main mb-3 leading-tight">Sign in to Cogniviti Bridge</h1>
              <p className="text-[14px] text-text-muted leading-relaxed">
                Access integrations, releases, monitoring, and operational health in one secure workspace.
              </p>
              <p className="text-[12px] text-text-muted/70 mt-2">
                Workspace access managed by your organization
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-medium text-text-main">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="h-11 px-4 rounded-lg border border-border-soft bg-background-light text-sm text-text-main placeholder:text-text-muted/50 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
                  autoComplete="email"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-text-main">
                    Password
                  </label>
                  <a href="#" className="text-xs text-text-muted/50 hover:text-text-main font-medium transition-colors">
                    Forgot password?
                  </a>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 px-4 rounded-lg border border-border-soft bg-background-light text-sm text-text-main placeholder:text-text-muted/50 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="h-[52px] rounded-lg bg-primary text-white text-[15px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-soft"
              >
                {loading ? (
                  <>
                    <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-border-soft text-center">
              <p className="text-sm text-text-muted">
                Don&apos;t have an account?{' '}
                <a href="#" className="text-primary font-medium hover:text-primary/80 transition-colors">
                  Request Access
                </a>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-text-muted/35 mt-7">
            By signing in, you agree to our{' '}
            <a href="#" className="underline hover:text-text-main transition-colors">Terms of Service</a>{' '}
            and{' '}
            <a href="#" className="underline hover:text-text-main transition-colors">Privacy Policy</a>.
          </p>
        </div>
      </main>
    </div>
  );
}
