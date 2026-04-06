import { APP_CONFIG } from '../config';

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Short label shown inline next to the message. */
export function formatMessageTime(date: Date): string {
  const isToday = isSameCalendarDay(date, new Date());
  const opts = isToday ? APP_CONFIG.timeFormatToday : APP_CONFIG.timeFormatPastDay;
  return date.toLocaleString(undefined, opts);
}

/** Full timestamp shown on hover: YYYY-MM-DD HH:mm:ss */
export function formatMessageTimeFull(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}
