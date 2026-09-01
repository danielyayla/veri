export * from './commands.ts';
export * from './templates.ts';
// The bound-test collector (WO-088, WO-093): the desktop app's sidecar
// reuses it for snapshot collection — the allowed ui → cli edge (DEC-060,
// the DEC-016 precedent).
export * from './testfacts.ts';
