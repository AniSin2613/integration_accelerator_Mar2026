/**
 * Lightweight in-memory notification store.
 *
 * Client-side notifications (from toast events) are stored here so the
 * NotificationsDropdown can display both server-side audit notifications
 * and local action notifications in the same list.
 */

export interface ClientNotification {
  id: string;
  icon: string;
  message: string;
  time: string;
  type: 'success' | 'error' | 'warning' | 'info';
  createdAt: string;
  read: boolean;
}

let notifications: ClientNotification[] = [];
let listeners: Array<() => void> = [];

function emit() {
  listeners.forEach((l) => l());
}

export const notificationStore = {
  getAll(): ClientNotification[] {
    return notifications;
  },

  getUnreadCount(): number {
    return notifications.filter((n) => !n.read).length;
  },

  add(message: string, type: ClientNotification['type'] = 'info') {
    const iconMap: Record<string, string> = {
      success: 'check_circle',
      error: 'error',
      warning: 'warning',
      info: 'info',
    };

    const entry: ClientNotification = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      icon: iconMap[type] ?? 'info',
      message,
      time: 'Just now',
      type,
      createdAt: new Date().toISOString(),
      read: false,
    };

    notifications = [entry, ...notifications].slice(0, 50); // keep last 50
    emit();
  },

  markAllRead() {
    notifications = notifications.map((n) => ({ ...n, read: true }));
    emit();
  },

  markRead(id: string) {
    notifications = notifications.map((n) => n.id === id ? { ...n, read: true } : n);
    emit();
  },

  clear() {
    notifications = [];
    emit();
  },

  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },
};
