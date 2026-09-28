/**
 * DealIQ Utility Functions
 */

/**
 * Format a number as Indian Rupees using the Indian numbering system.
 * e.g. 1500000 → ₹15,00,000
 */
export function formatINR(value: number): string {
  const intVal = Math.floor(Math.abs(value));
  const str = String(intVal);
  const prefix = value < 0 ? '-₹' : '₹';

  if (str.length <= 3) return `${prefix}${str}`;

  // Last 3 digits, then groups of 2
  const last3 = str.slice(-3);
  const rest = str.slice(0, -3);
  const parts: string[] = [];

  for (let i = rest.length; i > 0; i -= 2) {
    parts.unshift(rest.slice(Math.max(0, i - 2), i));
  }

  return `${prefix}${parts.join(',')},${last3}`;
}

/**
 * Format a date string (ISO) to human-readable format.
 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a datetime string relative (e.g. "2 days ago").
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Get CSS class for deal stage badge.
 */
export function getStageClass(stage: string): string {
  const map: Record<string, string> = {
    Discovery: 'badge-discovery',
    Qualification: 'badge-qualification',
    Proposal: 'badge-proposal',
    Negotiation: 'badge-negotiation',
    'Closed Won': 'badge-won',
    'Closed Lost': 'badge-lost',
  };
  return map[stage] ?? 'badge-default';
}

/**
 * Get CSS class for deal status badge.
 */
export function getStatusClass(status: string): string {
  const map: Record<string, string> = {
    Active: 'badge-active',
    'On Hold': 'badge-onhold',
    Closed: 'badge-closed',
  };
  return map[status] ?? 'badge-default';
}

/**
 * Truncate text to a max length with ellipsis.
 */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '…';
}

/**
 * Format timestamp for activity items (e.g. "Today, 4:42 PM" or "28 Sep, 4:42 PM").
 */
export function formatActivityTime(dateStr: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '—';

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;
  return `${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${timeStr}`;
}

