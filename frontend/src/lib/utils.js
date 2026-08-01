import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const LEVEL_STYLES = {
  none: { text: 'text-level-none', bg: 'bg-level-none/12', border: 'border-level-none/30', ring: 'var(--level-none)' },
  low: { text: 'text-level-low', bg: 'bg-level-low/12', border: 'border-level-low/30', ring: 'var(--level-low)' },
  medium: { text: 'text-level-medium', bg: 'bg-level-medium/12', border: 'border-level-medium/30', ring: 'var(--level-medium)' },
  high: { text: 'text-level-high', bg: 'bg-level-high/12', border: 'border-level-high/30', ring: 'var(--level-high)' },
  critical: { text: 'text-level-critical', bg: 'bg-level-critical/15', border: 'border-level-critical/40', ring: 'var(--level-critical)' },
};

export const levelStyle = (level) => LEVEL_STYLES[level] ?? LEVEL_STYLES.none;

export function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
