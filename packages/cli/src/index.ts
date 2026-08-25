export * from './commands.ts';
export * from './templates.ts';
// The observed-architecture collectors (WO-067, WO-068): the desktop app's
// sidecar reuses them for snapshot collection — the allowed ui → cli edge
// (DEC-060, the DEC-016 precedent).
export * from './imports.ts';
