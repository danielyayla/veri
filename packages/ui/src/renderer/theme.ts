import type { DocType } from '@veri/core';

/** Design tokens from design/README.md — type colors, status colors, tints. */

export interface TypeMeta {
  color: string;
  label: string;
  crumb: string;
  group: string;
}

export const TYPE_META: Record<DocType, TypeMeta> = {
  requirement: { color: '#7EA6C4', label: 'requirement', crumb: 'Requirements', group: 'REQUIREMENTS' },
  decision: { color: '#CFA83D', label: 'decision', crumb: 'Decisions', group: 'DECISIONS' },
  'work-order': { color: '#E8703A', label: 'work order', crumb: 'Work Orders', group: 'WORK ORDERS' },
  source: { color: '#908BA8', label: 'source', crumb: 'Sources', group: 'SOURCES' },
};

export const STATUS_COLORS: Record<string, string> = {
  accepted: '#7FAF8A',
  active: '#7FAF8A',
  done: '#7FAF8A',
  draft: '#D9A03F',
  proposed: '#D9A03F',
  backlog: '#A09DA6',
  retired: '#8B8893',
  superseded: '#D9A03F',
  'in-progress': '#E8703A',
  imported: '#908BA8',
};

export function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? '#A09DA6';
}

/** The chip background formula from the README: the chip's color at 10% alpha. */
export function tint(hex: string, alpha = 0.1): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
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
