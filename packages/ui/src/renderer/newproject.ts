/** Pure rules for the New-project sheet's editable name (WO-020, SRC-007 addendum). */

const NUL = String.fromCharCode(0);

/** Last path segment of a picked directory, trailing slashes ignored. */
export function dirBasename(dir: string): string {
  const trimmed = dir.replace(/\/+$/, '');
  return trimmed.slice(trimmed.lastIndexOf('/') + 1);
}

/**
 * The name is never stored — it only composes the target folder (DEC-002).
 * The picked folder's own basename targets the picked folder itself,
 * byte-for-byte the WO-018 behavior; any other name targets a subfolder,
 * which the scaffold's recursive mkdir creates (DEC-016).
 */
export function composeTarget(dir: string, name: string): string {
  if (name === dirBasename(dir)) return dir;
  return `${dir.replace(/\/+$/, '')}/${name}`;
}

/**
 * Create is disabled only for names no folder can have: empty, `.`, `..`,
 * a path separator, or NUL. Everything else is the filesystem's call — a
 * rejected mkdir surfaces in the sheet's existing error treatment.
 */
export function isValidProjectName(name: string): boolean {
  if (name === '' || name === '.' || name === '..') return false;
  return !(name.includes('/') || name.includes('\\') || name.includes(NUL));
}
