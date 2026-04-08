'use client';

import { useState } from 'react';

export default function SupportPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="max-w-2xl mx-auto py-10 px-6">
      <h1 className="text-2xl font-bold text-text-main">Support &amp; Contact</h1>
      <p className="mt-2 text-sm text-text-muted">
        Need help? Reach out to the Cogniviti Bridge team.
      </p>

      <div className="mt-8 space-y-6">
        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href="/docs"
            className="flex items-center gap-3 rounded-xl border border-border-soft bg-surface p-4 hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[22px] text-primary">menu_book</span>
            <div>
              <p className="text-[14px] font-semibold text-text-main">Documentation</p>
              <p className="text-[12px] text-text-muted">Browse guides &amp; references</p>
            </div>
          </a>
          <a
            href="/docs/getting-started"
            className="flex items-center gap-3 rounded-xl border border-border-soft bg-surface p-4 hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[22px] text-primary">rocket_launch</span>
            <div>
              <p className="text-[14px] font-semibold text-text-main">Getting Started</p>
              <p className="text-[12px] text-text-muted">First-time setup guide</p>
            </div>
          </a>
        </div>

        {/* Contact form */}
        {submitted ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <span className="material-symbols-outlined text-[32px] text-emerald-600">check_circle</span>
            <p className="mt-2 text-[14px] font-semibold text-emerald-800">Message sent!</p>
            <p className="mt-1 text-[13px] text-emerald-600">We&apos;ll get back to you shortly.</p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
            className="space-y-4 rounded-xl border border-border-soft bg-surface p-6"
          >
            <h2 className="text-[15px] font-semibold text-text-main">Contact Us</h2>

            <div>
              <label htmlFor="subject" className="block text-[13px] font-medium text-text-main mb-1">
                Subject
              </label>
              <input
                id="subject"
                type="text"
                required
                className="w-full rounded-lg border border-border-soft bg-background-light px-3 py-2 text-[14px] text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                placeholder="Brief description of your issue"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-[13px] font-medium text-text-main mb-1">
                Message
              </label>
              <textarea
                id="message"
                required
                rows={4}
                className="w-full rounded-lg border border-border-soft bg-background-light px-3 py-2 text-[14px] text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 resize-none"
                placeholder="Describe your issue or question..."
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 transition-colors"
            >
              Send Message
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
