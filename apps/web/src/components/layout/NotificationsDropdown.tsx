'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { api } from '@/lib/api-client';
import { notificationStore, ClientNotification } from '@/lib/notification-store';

interface ServerNotification {
  id: string;
  icon: string;
  message: string;
  time: string;
  action: string;
  createdAt: string;
}

type UnifiedNotification = {
  id: string;
  icon: string;
  message: string;
  time: string;
  createdAt: string;
  type?: ClientNotification['type'];
  read?: boolean;
  isClient?: boolean;
};

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [serverNotifs, setServerNotifs] = useState<ServerNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Subscribe to client-side notifications
  const clientNotifs = useSyncExternalStore(
    notificationStore.subscribe,
    notificationStore.getAll,
    notificationStore.getAll,
  );

  const unreadCount = clientNotifs.filter((n) => !n.read).length;

  // Track previous open state so we mark-read only on close (open→closed transition)
  const prevOpenRef = useRef(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Mark all as read when dropdown CLOSES (not on open)
  useEffect(() => {
    if (prevOpenRef.current && !open) {
      notificationStore.markAllRead();
    }
    prevOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .get<ServerNotification[]>('/dashboard/notifications?limit=15')
      .then((data) => {
        setServerNotifs(data);
        setLoading(false);
      })
      .catch(() => {
        setServerNotifs([]);
        setLoading(false);
      });
  }, [open]);

  // Merge and sort: client notifications first (most recent), then server notifications
  const allNotifications: UnifiedNotification[] = [
    ...clientNotifs.map((n) => ({
      id: n.id,
      icon: n.icon,
      message: n.message,
      time: n.time,
      createdAt: n.createdAt,
      type: n.type,
      read: n.read,
      isClient: true,
    })),
    ...serverNotifs.map((n) => ({
      id: n.id,
      icon: n.icon,
      message: n.message,
      time: n.time,
      createdAt: n.createdAt,
      read: true,
      isClient: false,
    })),
  ];

  const iconColor = (type?: string) => {
    switch (type) {
      case 'success': return 'text-emerald-600';
      case 'error': return 'text-rose-600';
      case 'warning': return 'text-amber-600';
      default: return 'text-text-muted';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-text-muted transition-colors relative"
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined text-[20px]">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-surface">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] rounded-xl border border-border-soft bg-surface shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border-soft bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-semibold text-text-main">Notifications</h3>
              <p className="text-[11px] text-text-muted">Recent activity &amp; alerts</p>
            </div>
            {clientNotifs.length > 0 && (
              <button
                type="button"
                onClick={() => notificationStore.clear()}
                className="text-[11px] text-text-muted hover:text-text-main transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {loading && (
              <div className="p-6 text-center text-sm text-text-muted">Loading…</div>
            )}

            {!loading && allNotifications.length === 0 && (
              <div className="p-6 text-center">
                <span className="material-symbols-outlined text-[32px] text-text-muted/30">notifications_off</span>
                <p className="text-sm text-text-muted mt-2">No recent activity</p>
              </div>
            )}

            {!loading && allNotifications.length > 0 && (
              <ul className="divide-y divide-border-soft">
                {allNotifications.map((n) => (
                  <li key={n.id} className={`px-4 py-3 hover:bg-slate-100 transition-colors cursor-default ${!n.read ? 'bg-blue-50/80 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'}`}>
                    <div className="flex items-start gap-3">
                      <span className={`material-symbols-outlined text-[16px] mt-0.5 shrink-0 ${iconColor(n.type)}`}>
                        {n.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] leading-snug ${!n.read ? 'text-text-main font-medium' : 'text-text-main'}`}>{n.message}</p>
                        <p className="text-[11px] text-text-muted mt-0.5">{n.time}</p>
                      </div>
                      {!n.read && (
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
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
