const MUTE_KEY = 'swan-talk-notifications-muted';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function isNotificationMuted(): boolean {
  return localStorage.getItem(MUTE_KEY) === 'true';
}

export function setNotificationMuted(muted: boolean): void {
  localStorage.setItem(MUTE_KEY, String(muted));
}

/** Requests browser permission. Safe to call multiple times — no-ops if already granted/denied. */
export async function requestNotificationPermission(): Promise<void> {
  if (!isNotificationSupported()) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

export function fireNotification(
  title: string,
  body: string,
  icon?: string,
): void {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;
  if (isNotificationMuted()) return;
  if (document.visibilityState === 'visible') return; // tab is focused — no need

  new Notification(title, {
    body,
    icon: icon || '/favicon.svg',
    badge: '/favicon.svg',
  });
}
