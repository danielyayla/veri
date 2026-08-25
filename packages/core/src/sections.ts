/**
 * The one section-splice implementation (DEC-100): every surface that appends
 * a dated line under a `## Heading` — receipts (mcp), notes and review notes
 * (ui) — calls this instead of keeping its own copy. Entry-line composition
 * stays with the caller; the seam is the splice.
 */

export interface AppendToSectionOptions {
  /** A placeholder line to strip when the section still holds it, e.g. "(none yet)". */
  placeholder?: string;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Append `line` under `## {heading}`, creating the section at the end of the
 * document when the heading is missing. Existing entries are preserved and
 * the line lands last; everything outside the section is untouched. The
 * heading match is exact (`^## {heading}` with trailing spaces tolerated) —
 * `### {heading}` and prose mentions never match.
 */
export function appendToSection(
  content: string,
  heading: string,
  line: string,
  options: AppendToSectionOptions = {},
): string {
  const headingMatch = new RegExp(`^## ${escapeRegExp(heading)}[ \\t]*$`, 'm').exec(content);
  if (headingMatch === null) {
    return `${content.trimEnd()}\n\n## ${heading}\n\n${line}\n`;
  }
  const afterHeading = headingMatch.index + headingMatch[0].length;
  const rest = content.slice(afterHeading);
  const nextHeading = rest.search(/^##\s/m);
  const sectionEnd = nextHeading >= 0 ? afterHeading + nextHeading : content.length;

  let existing = content.slice(afterHeading, sectionEnd);
  if (options.placeholder !== undefined) {
    existing = existing.replace(new RegExp(`^${escapeRegExp(options.placeholder)}[ \\t]*$`, 'm'), '');
  }
  existing = existing.trim();

  const before = content.slice(0, afterHeading);
  const after = content.slice(sectionEnd);
  const section = `\n\n${existing === '' ? '' : `${existing}\n`}${line}\n`;
  return `${before}${section}${after === '' ? '' : `\n${after}`}`;
}
