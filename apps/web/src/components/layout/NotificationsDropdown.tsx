'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api-client';

interface Notification {
  id: string;
  icon: string;
  message: string;
  time: string;
  action: string;
  createdAt: string;
}

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .get<Notification[]>('/dashboard/notifications?limit=15')
      .then((data) => {
        setNotifications(data);
        setLoading(false);
      })
      .catch(() => {
        setNotifications([]);
        setLoading(false);
      });
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-text-muted transition-colors relative"
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined text-[20px]">notifications</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] rounded-xl border border-border-soft bg-surface shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border-soft bg-slate-50/50">
            <h3 className="text-[14px] font-semibold text-text-main">Notifications</h3>
            <p className="text-[11px] text-text-muted">Recent activity from audit trail</p>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {loading && (
              <div className="p-6 text-center text-sm text-text-muted">Loading…</div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="p-6 text-center">
                <span className="material-symbols-outlined text-[32px] text-text-muted/30">notifications_off</span>
                <p className="text-sm text-text-muted mt-2">No recent activity</p>
              </div>
            )}

            {!loading && notifications.length > 0 && (
              <ul className="divide-y divide-border-soft">
                {notifications.map((n) => (
                  <li key={n.id} className="px-4 py-3 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[16px] text-text-muted mt-0.5 shrink-0">
                        {n.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-text-main leading-snug">{n.message}</p>
                        <p className="text-[11px] text-text-muted mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
