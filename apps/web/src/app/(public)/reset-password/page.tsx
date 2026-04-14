'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!email) {
      setMessage({ type: 'error', text: 'Please enter your email address.' });
      return;
    }
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/auth/reset-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, newPassword }),
        },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Something went wrong');
      }

      setMessage({ type: 'success', text: 'Password has been reset. You can now sign in with your new password.' });
      setEmail('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message ?? 'Failed to reset password.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background-light font-display min-h-screen text-text-main flex flex-col">
      {/* Header */}
      <header className="flex items-center border-b border-border-soft bg-surface px-6 lg:px-10 py-4">
        <Link href="/" className="flex items-center gap-3 text-text-main">
          <div className="size-6 text-primary">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_reset)">
                <path
                  clipRule="evenodd"
                  d="M47.2426 24L24 47.2426L0.757355 24L24 0.757355L47.2426 24ZM12.2426 21H35.7574L24 9.24264L12.2426 21Z"
                  fill="currentColor"
                  fillRule="evenodd"
                />
              </g>
              <defs>
                <clipPath id="clip0_reset">
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

      {/* Form */}
      <main className="flex-1 flex items-center justify-center px-6 pt-8 pb-20">
        <div className="w-full max-w-[425px]">
          <div className="bg-surface rounded-xl border border-slate-200/60 shadow-soft p-9 sm:p-10">
            <div className="text-center mb-5">
              <h1 className="text-[22px] font-bold text-text-main mb-3 leading-tight">Reset Your Password</h1>
              <p className="text-[14px] text-text-muted leading-relaxed">
                Enter your email address and choose a new password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-medium text-text-main">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="h-11 px-4 rounded-lg border border-border-soft bg-background-light text-sm text-text-main placeholder:text-text-muted/50 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
                  autoComplete="email"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="newPassword" className="text-sm font-medium text-text-main">New Password</label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                  minLength={8}
                  className="h-11 px-4 rounded-lg border border-border-soft bg-background-light text-sm text-text-main placeholder:text-text-muted/50 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
                  autoComplete="new-password"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-text-main">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  required
                  minLength={8}
                  className="h-11 px-4 rounded-lg border border-border-soft bg-background-light text-sm text-text-main placeholder:text-text-muted/50 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
                  autoComplete="new-password"
                />
              </div>

              {message && (
                <p className={`text-sm px-3 py-2 rounded-lg ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                  {message.text}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="h-[52px] rounded-lg bg-primary text-white text-[15px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-soft"
              >
                {loading ? (
                  <>
                    <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Resetting…
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-border-soft text-center">
              <p className="text-sm text-text-muted">
                Remember your password?{' '}
                <Link href="/login" className="text-primary font-medium hover:text-primary/80 transition-colors">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
