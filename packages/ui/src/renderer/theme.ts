import type { DocType } from '@veri/core';

/** Design tokens from design/README.md — type colors, status colors, tints.
    All values are CSS variables so the two palettes in styles.css (WO-060,
    SRC-032) reach inline styles too; literals live only in the token blocks. */

export interface TypeMeta {
  color: string;
  label: string;
  crumb: string;
  group: string;
}

export const TYPE_META: Record<DocType, TypeMeta> = {
  requirement: { color: 'var(--t-req)', label: 'requirement', crumb: 'Requirements', group: 'REQUIREMENTS' },
  decision: { color: 'var(--t-dec)', label: 'decision', crumb: 'Decisions', group: 'DECISIONS' },
  'work-order': { color: 'var(--t-wo)', label: 'work order', crumb: 'Work Orders', group: 'WORK ORDERS' },
  source: { color: 'var(--t-src)', label: 'source', crumb: 'Sources', group: 'SOURCES' },
  workflow: { color: 'var(--t-wf)', label: 'workflow', crumb: 'Workflow', group: 'WORKFLOW' },
};

export const STATUS_COLORS: Record<string, string> = {
  accepted: 'var(--green)',
  active: 'var(--green)',
  done: 'var(--green)',
  draft: 'var(--amber)',
  proposed: 'var(--amber)',
  backlog: 'var(--secondary)',
  retired: 'var(--muted)',
  superseded: 'var(--amber)',
  'in-progress': 'var(--ember)',
  imported: 'var(--t-src)',
};

export function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? 'var(--secondary)';
}

/** The chip background formula from the README: the chip's color at 10% alpha.
    color-mix instead of rgba so var() colors stay theme-reactive. */
export function tint(color: string, alpha = 0.1): string {
  return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;
}

/** "1.8k" / "842" — the panel's per-doc token format. */
export function fmtTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

/** Relative time from a YYYY-MM-DD date. Coarse by design — docs carry dates, not clocks. */
export function relTime(date: string, now = new Date()): string {
  const then = new Date(`${date}T00:00:00`);
  if (Number.isNaN(then.getTime())) return date;
  const days = Math.floor((now.getTime() - then.getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return '1d ago';
  if (days <= 60) return `${days}d ago`;
  return date;
}
