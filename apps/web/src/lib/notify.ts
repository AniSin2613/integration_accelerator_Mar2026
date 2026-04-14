/**
 * App-wide notification helper.
 *
 * Fires a sonner toast AND persists the notification to the in-memory store
 * so the Notifications dropdown always has a complete history.
 */

import { toast } from 'sonner';
import { notificationStore } from './notification-store';

export const notify = {
  success(message: string) {
    toast.success(message);
    notificationStore.add(message, 'success');
  },
  error(message: string) {
    toast.error(message);
    notificationStore.add(message, 'error');
  },
  warning(message: string) {
    toast.warning(message);
    notificationStore.add(message, 'warning');
  },
  info(message: string) {
    toast.info(message);
    notificationStore.add(message, 'info');
  },
};
