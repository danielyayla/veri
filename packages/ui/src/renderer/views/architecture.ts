/**
 * The Architecture view (WO-068, SRC-036): the map is the primary
 * experience — governance is an overlay on the model, not the model itself.
 * Two internal tabs: Map (module cards on a depth-layered canvas, edges
 * encoded by provenance, a detail panel with the contents drill-down) and
 * Rules (the N×N lattice with ISSUES / VIOLATIONS / CONSTRAINTS / MODULES
 * cards). Everything renders from the snapshot; the entry points (Home
 * card, ⌘K, `architecture ↗`) are the provisional SRC-036 placement —
 * nothing here depends on how the view was reached.
 */
import { h, svgEl } from '../dom.ts';
import { TYPE_META } from '../theme.ts';
import {
  CARD_H,
  CARD_W,
  archModel,
  edgeGeometry,
  edgeTier,
  governingDecisions,
  latticeCell,
  listDir,
  mapLayout,
  moduleDeps,
  moduleFileCount,
  relatedRequirements,
} from '../archderive.ts';
import type { ArchModel, LatticeCell } from '../archderive.ts';
import { idChip } from '../widgets.ts';
import type { Ctx } from '../app.ts';

/** How one lattice cell renders — pure, so the matrix states are testable. */
export function cellRender(cell: LatticeCell): { glyph: string; cls: string; title: string } {
  if (cell.kind === 'self') return { glyph: '', cls: 'mx-self', title: '' };
  if (cell.kind === 'unconstrained') return { glyph: '·', cls: 'mx-cell', title: 'unconstrained' };
  if (cell.kind === 'conflict') {
    return {
      glyph: '⚠',
      cls: 'mx-cell mx-conflict',
      title: `conflict: allowed by ${cell.allowedBy.join(', ')}, forbidden by ${cell.forbiddenBy.join(', ')}`,
    };
  }
  const severity = cell.severity === 'error' ? ' · error' : '';
  return {
    glyph: cell.allowed ? '✓' : '⨯',
    cls: cell.allowed ? 'mx-cell mx-rule mx-allow' : 'mx-cell mx-rule mx-forbid',
    title: `${cell.allowed ? 'allowed' : 'forbidden'} (${cell.decisionId}${severity})`,
  };
}

/** The provenance chip's text for a dependency row — never blurred. */
export function provLabel(provenance: 'observed' | 'declared' | 'declared + observed'): string {
  return provenance;
}

const srcTag = (text: string, declared: boolean): HTMLElement =>
  h('span', { class: declared ? 'dt-srctag dt-srctag-declared' : 'dt-srctag' }, text);

const ring = (): HTMLElement => h('span', { class: 'adv-ring' });
const errDot = (): HTMLElement => h('span', { class: 'arch-errdot' });

function sevBadge(severity: 'advisory' | 'error'): HTMLElement {
  return h('span', { class: severity === 'error' ? 'cn-sev cn-sev-error' : 'cn-sev' }, severity);
}

function cardHead(dotColor: string, label: string, meta: HTMLElement | string | null): HTMLElement {
  return h(
    'div',
    { class: 'hv-card-head' },
    h('span', { class: 'hv-dot', style: `background:${dotColor};` }),
    h('span', { class: 'hv-label' }, label),
    typeof meta === 'string' ? h('span', { class: 'hv-meta' }, meta) : meta,
  );
}

// ---- The map --------------------------------------------------------------

function mapCard(ctx: Ctx, model: ArchModel): HTMLElement {
  const names = model.modules.map((entry) => entry.name);
  const layout = mapLayout(names, model.observed);
  const svg = svgEl('svg', {
    class: 'arch-svg',
    width: String(layout.width),
    height: String(layout.height),
    viewBox: `0 0 ${layout.width} ${layout.height}`,
    'aria-hidden': 'true',
  });
  const defs = svgEl('defs', {});
  for (const [id, color] of [
    ['arch-ar-g', 'var(--faint)'],
    ['arch-ar-w', 'var(--amber)'],
  ]) {
    const marker = svgEl('marker', {
      id,
      viewBox: '0 0 8 8',
      refX: '7',
      refY: '4',
      markerWidth: '7',
      markerHeight: '7',
      orient: 'auto',
    });
    marker.append(svgEl('path', { d: 'M0,0 L8,4 L0,8 z', fill: color }));
    defs.append(marker);
  }
  svg.append(defs);
  const glyphText = (x: number, y: number, fill: string, text: string, size = '10'): SVGElement => {
    const el = svgEl('text', { x: String(x), y: String(y), 'font-size': size, fill, class: 'arch-svg-label' });
    el.append(document.createTextNode(text));
    return el;
  };
  // Observed imports: the only solid lines on the map — discovered facts.
  for (const edge of model.observed) {
    const a = layout.pos.get(edge.from);
    const b = layout.pos.get(edge.to);
    if (a === undefined || b === undefined) continue;
    const g = edgeGeometry(a, b);
    const tier = edgeTier(model, edge.from, edge.to);
    const err = tier === 'error';
    svg.append(
      svgEl('line', {
        x1: String(g.x1),
        y1: String(g.y1),
        x2: String(g.x2),
        y2: String(g.y2),
        stroke: err ? 'var(--amber)' : 'var(--faint)',
        'stroke-width': '1.5',
        'marker-end': `url(#${err ? 'arch-ar-w' : 'arch-ar-g'})`,
        opacity: tier !== null ? '1' : '0.8',
      }),
    );
    if (tier === 'conflict') {
      svg.append(glyphText(g.mx - 5, g.my + 3, 'var(--amber)', '⚠', '11'));
    } else if (tier === 'error') {
      svg.append(svgEl('circle', { cx: String(g.mx), cy: String(g.my), r: '4', fill: 'var(--amber)' }));
      svg.append(glyphText(g.mx + 9, g.my + 4, 'var(--amber)', '⨯ forbidden'));
    } else if (tier === 'advisory') {
      svg.append(
        svgEl('circle', { cx: String(g.mx), cy: String(g.my), r: '3.5', fill: 'none', stroke: 'var(--muted)', 'stroke-width': '1.2' }),
      );
      svg.append(glyphText(g.mx + 9, g.my + 4, 'var(--muted)', '⨯ forbidden'));
    } else if (model.rules.some((rule) => rule.from === edge.from && rule.to === edge.to && rule.allowed)) {
      svg.append(glyphText(g.mx + 8, g.my + 2, 'var(--green)', '✓', '11'));
    }
  }
  // Declared rules with no observed traffic: dashed gold guardrails —
  // the intended architecture, visibly distinct from discovery.
  for (const rule of model.rules.filter((r) => !r.allowed)) {
    if (model.observed.some((edge) => edge.from === rule.from && edge.to === rule.to)) continue;
    if (model.conflicts.some((c) => c.from === rule.from && c.to === rule.to)) continue;
    const a = layout.pos.get(rule.from);
    const b = layout.pos.get(rule.to);
    if (a === undefined || b === undefined) continue;
    const g = edgeGeometry(a, b);
    svg.append(
      svgEl('line', {
        x1: String(g.x1),
        y1: String(g.y1),
        x2: String(g.x2),
        y2: String(g.y2),
        stroke: 'var(--t-dec)',
        'stroke-width': '1',
        'stroke-dasharray': '3 5',
        opacity: '0.35',
      }),
    );
    svg.append(glyphText(g.mx - 4, g.my + 3, 'var(--t-dec)', '⨯'));
  }
  for (const conflict of model.conflicts) {
    if (model.observed.some((edge) => edge.from === conflict.from && edge.to === conflict.to)) continue;
    const a = layout.pos.get(conflict.from);
    const b = layout.pos.get(conflict.to);
    if (a === undefined || b === undefined) continue;
    const g = edgeGeometry(a, b);
    svg.append(
      svgEl('line', {
        x1: String(g.x1),
        y1: String(g.y1),
        x2: String(g.x2),
        y2: String(g.y2),
        stroke: 'var(--amber)',
        'stroke-width': '1',
        'stroke-dasharray': '3 5',
        opacity: '0.6',
      }),
    );
    svg.append(glyphText(g.mx - 5, g.my + 3, 'var(--amber)', '⚠', '11'));
  }

  const cards = model.modules.map((entry) => {
    const pos = layout.pos.get(entry.name)!;
    const onDisk = model.onDisk.has(entry.name);
    const advisory = model.advisories.some((v) => v.from === entry.name);
    const selected = ctx.state.archSel === entry.name;
    return h(
      'button',
      {
        class: `btn-reset arch-mod${selected ? ' arch-mod-sel' : ''}${onDisk ? '' : ' arch-mod-ghost'}`,
        style: `left:${pos.x}px;top:${pos.y}px;width:${CARD_W}px;height:${CARD_H}px;`,
        label: `Module ${entry.name} — ${entry.purpose}`,
        fkey: `arch-mod:${entry.name}`,
        onClick: () => ctx.update({ archSel: selected ? null : entry.name, archDrill: [] }),
      },
      h(
        'div',
        { class: 'arch-mod-name' },
        entry.name,
        advisory ? h('span', { class: 'adv-ring arch-mod-ring', title: 'observed violation' }) : null,
      ),
      h('div', { class: 'arch-mod-purpose' }, entry.purpose),
      h(
        'div',
        { class: 'arch-mod-meta' },
        onDisk
          ? `${moduleFileCount(model, entry.name)} files · ${moduleDeps(model, entry.name).out.length} outbound`
          : 'not on disk — skipped',
      ),
    );
  });

  const legend = h(
    'div',
    { class: 'arch-legend' },
    h('span', {}, h('span', { class: 'arch-lg-line' }), 'observed import ', h('span', { class: 'arch-lg-src' }, '(repository)')),
    h('span', {}, h('span', { class: 'arch-lg-dash' }), 'declared rule ', h('span', { class: 'arch-lg-src' }, '(decisions)')),
    h('span', {}, ring(), 'violation · advisory'),
    h('span', {}, errDot(), 'violation · error'),
    h('span', {}, h('span', { style: 'color:var(--amber);' }, '⚠'), ' conflict'),
  );

  return h(
    'div',
    { class: 'hv-card' },
    cardHead('var(--secondary)', 'SYSTEM MAP', `${model.modules.length} modules · ${model.observed.length} observed edges`),
    h(
      'div',
      { class: 'arch-map-scroll' },
      h('div', { class: 'arch-map', style: `width:${layout.width}px;height:${layout.height}px;` }, svg, ...cards),
    ),
    legend,
  );
}

// ---- Module detail panel --------------------------------------------------

function detailPanel(ctx: Ctx, model: ArchModel): HTMLElement | null {
  const name = ctx.state.archSel;
  const entry = model.modules.find((m) => m.name === name);
  if (name === null || entry === undefined) return null;
  const deps = moduleDeps(model, name);
  const governing = governingDecisions(model, name);
  const reqs = relatedRequirements(ctx.byId, governing);
  const exports = model.exports[name] ?? [];

  const secHead = (label: string, tag: HTMLElement): HTMLElement => h('div', { class: 'dt-h' }, label, tag);
  const depRow = (row: (typeof deps.out)[number], dir: 'out' | 'in'): HTMLElement =>
    h(
      'div',
      { class: 'dep-row' },
      h('span', { class: 'dep-edge' }, `${dir === 'out' ? '→' : '←'} ${row.other}`),
      h('span', { class: 'dep-count' }, `${row.count} import${row.count === 1 ? '' : 's'}`),
      h('span', { class: row.provenance === 'observed' ? 'dep-prov' : 'dep-prov dep-prov-declared' }, provLabel(row.provenance)),
      row.conflict ? h('span', { style: 'color:var(--amber);' }, '⚠ conflict') : null,
      row.viol === 'error' ? h('span', { style: 'color:var(--amber);' }, '⨯ forbidden — error') : null,
      row.viol === 'advisory' ? h('span', { style: 'color:var(--faint);' }, '⨯ forbidden') : null,
    );

  // Contents drill-down: module → directory → file → its imports. The last
  // drill segment may name a file, whose specifiers expand inline.
  const drill = ctx.state.archDrill;
  const rows = listDir(model.files, name, entry.path, drill);
  const fileOpen = rows.length === 0 && drill.length > 0;
  const dirPath = fileOpen ? drill.slice(0, -1) : drill;
  const level = fileOpen ? listDir(model.files, name, entry.path, dirPath) : rows;
  const openFile = fileOpen ? drill[drill.length - 1] : null;
  const crumbs = h(
    'div',
    { class: 'arch-crumbs' },
    h(
      'button',
      { class: drill.length === 0 ? 'btn-reset arch-crumb arch-crumb-here' : 'btn-reset arch-crumb', fkey: 'arch-crumb:root', onClick: () => ctx.update({ archDrill: [] }) },
      name,
    ),
    ...dirPath.flatMap((seg, i) => [
      h('span', { class: 'arch-crumb-sep' }, '/'),
      h(
        'button',
        {
          class: i === dirPath.length - 1 && !fileOpen ? 'btn-reset arch-crumb arch-crumb-here' : 'btn-reset arch-crumb',
          fkey: `arch-crumb:${i}`,
          onClick: () => ctx.update({ archDrill: dirPath.slice(0, i + 1) }),
        },
        seg,
      ),
    ]),
    ...(openFile !== null ? [h('span', { class: 'arch-crumb-sep' }, '/'), h('span', { class: 'arch-crumb arch-crumb-here' }, openFile)] : []),
  );
  const treeRows = level.map((row) => {
    const open = row.kind === 'file' && row.name === openFile;
    const target = row.kind === 'dir' ? [...dirPath, row.name] : open ? dirPath : [...dirPath, row.name];
    return h(
      'div',
      {},
      h(
        'button',
        {
          class: 'btn-reset btn-block arch-tree-row',
          fkey: `arch-tree:${row.name}`,
          onClick: () => ctx.update({ archDrill: target }),
        },
        h('span', { class: 'arch-tree-glyph' }, row.kind === 'dir' ? '▸' : open ? '▾' : '·'),
        row.kind === 'dir' ? `${row.name}/` : row.name,
        h(
          'span',
          { class: 'arch-tree-meta' },
          row.kind === 'dir' ? `${row.fileCount} file${row.fileCount === 1 ? '' : 's'}` : `${row.fileCount} import${row.fileCount === 1 ? '' : 's'}`,
        ),
      ),
      open
        ? h(
            'div',
            { class: 'arch-file-imports' },
            ...(row.imports.length > 0
              ? row.imports.map((spec) => h('div', {}, `imports ${spec}`))
              : [h('div', {}, 'no imports')]),
          )
        : null,
    );
  });

  return h(
    'div',
    { class: 'hv-card' },
    cardHead(
      'var(--ember)',
      `MODULE · ${name}`,
      h('span', { class: 'hv-meta arch-detail-purpose' }, entry.purpose),
    ),
    h(
      'div',
      { class: 'dt-grid' },
      h(
        'div',
        { class: 'dt-sec' },
        secHead('Responsibilities', srcTag('declared · registry', true)),
        h(
          'ul',
          { class: 'dt-list' },
          ...(entry.responsibilities ?? [entry.purpose]).map((line) => h('li', {}, line)),
        ),
      ),
      h(
        'div',
        { class: 'dt-sec' },
        secHead('Public interface', srcTag('discovered · exports', false)),
        exports.length > 0
          ? h('div', { class: 'arch-iface' }, ...exports.map((sym) => h('div', {}, sym)))
          : h('div', { class: 'arch-empty-line' }, 'no entry point discovered'),
      ),
      h(
        'div',
        { class: 'dt-sec' },
        secHead('Governed by', srcTag('declared · decisions', true)),
        governing.length > 0
          ? h('div', { class: 'arch-chip-row' }, ...governing.map((id) => idChip(ctx.byId, id, ctx)))
          : h('div', { class: 'arch-empty-line' }, 'no decision constrains this module'),
        ...(reqs.length > 0
          ? [
              h('div', { class: 'dt-h arch-dt-gap' }, 'Related requirements'),
              h('div', { class: 'arch-chip-row' }, ...reqs.map((id) => idChip(ctx.byId, id, ctx))),
            ]
          : []),
      ),
      h(
        'div',
        { class: 'dt-sec' },
        secHead('Dependencies', srcTag('discovered · imports', false)),
        ...(deps.out.length > 0 ? deps.out.map((row) => depRow(row, 'out')) : [h('div', { class: 'arch-empty-line' }, 'none — imports no module')]),
        h('div', { class: 'dt-h arch-dt-gap' }, 'Dependents'),
        ...(deps.in.length > 0 ? deps.in.map((row) => depRow(row, 'in')) : [h('div', { class: 'arch-empty-line' }, 'none — top of the stack')]),
      ),
      h(
        'div',
        { class: 'dt-sec dt-sec-full' },
        secHead('Contents', srcTag('discovered · file tree', false)),
        crumbs,
        ...(level.length > 0 ? treeRows : [h('div', { class: 'arch-empty-line' }, 'nothing scanned under this path')]),
      ),
    ),
  );
}

// ---- The rules tab --------------------------------------------------------

function latticeCard(ctx: Ctx, model: ArchModel): HTMLElement {
  const names = model.modules.map((entry) => entry.name);
  const header = h(
    'tr',
    {},
    h('th', { class: 'mx-from mx-axis' }, 'from ↓ to →'),
    ...names.map((name) => h('th', {}, name)),
  );
  const rows = names.map((from) =>
    h(
      'tr',
      {},
      h('th', { class: 'mx-from' }, from),
      ...names.map((to) => {
        const cell = latticeCell(model, from, to);
        const r = cellRender(cell);
        const badge =
          cell.kind === 'rule' && cell.violations > 0
            ? h('span', { class: 'mx-viol' }, cell.violTier === 'error' ? errDot() : ring(), String(cell.violations))
            : null;
        const glyph = h('span', { class: `mx-glyph${cell.kind === 'unconstrained' ? ' mx-none' : ''}` }, r.glyph);
        if (cell.kind === 'rule') {
          return h(
            'td',
            { class: r.cls },
            h(
              'button',
              {
                class: 'btn-reset mx-btn',
                title: `${from} → ${to} — ${r.title}`,
                label: `${from} to ${to} — ${r.title}`,
                fkey: `mx:${from}:${to}`,
                onClick: (e) => ctx.openDoc(cell.decisionId, { preview: true, background: e.metaKey || e.ctrlKey }),
              },
              badge,
              glyph,
            ),
          );
        }
        return h('td', { class: r.cls, title: r.title === '' ? undefined : `${from} → ${to} — ${r.title}` }, badge, glyph);
      }),
    ),
  );
  const table = h('table', { class: 'mx' }, header, ...rows);
  const legend = h(
    'div',
    { class: 'arch-legend' },
    h('span', {}, h('span', { class: 'mx-forbid' }, '⨯'), ' forbidden'),
    h('span', {}, h('span', { class: 'mx-allow' }, '✓'), ' allowed'),
    h('span', {}, h('span', { class: 'mx-none' }, '·'), ' unconstrained'),
    h('span', {}, ring(), ' violated · advisory'),
    h('span', {}, errDot(), ' violated · error'),
    h('span', {}, h('span', { style: 'color:var(--amber);' }, '⚠'), ' conflict'),
  );
  return h(
    'div',
    { class: 'hv-card' },
    cardHead('var(--faint)', 'DEPENDENCY RULES', `${model.modules.length} modules · ${model.rules.length} constraints`),
    h('div', { class: 'mx-wrap' }, table),
    legend,
  );
}

function rulesTab(ctx: Ctx, model: ArchModel): HTMLElement[] {
  const issueRow = (children: Array<HTMLElement | string>): HTMLElement => h('div', { class: 'arch-warn-row' }, ...children);
  const issueRows = [
    ...model.conflicts.map((c) =>
      issueRow([
        h('span', { class: 'arch-warn-tag' }, '⚠ arch-conflict'),
        h(
          'span',
          { class: 'arch-warn-msg' },
          `${c.from} → ${c.to}: allowed by `,
          ...c.allowedBy.map((id) => idChip(ctx.byId, id, ctx)),
          ' but forbidden by ',
          ...c.forbiddenBy.map((id) => idChip(ctx.byId, id, ctx)),
          ' — supersede one so the intended architecture speaks with one voice',
        ),
      ]),
    ),
    ...model.errors.map((v) =>
      issueRow([
        h('span', { class: 'arch-warn-tag' }, '⚠ arch-violation'),
        h(
          'span',
          { class: 'arch-warn-msg' },
          h('span', { class: 'arch-strong' }, v.file),
          ` imports "${v.specifier}" — ${v.from} → ${v.to} is forbidden by `,
          ...v.forbiddenBy.map((id) => idChip(ctx.byId, id, ctx)),
          ' at severity ',
          h('span', { class: 'arch-strong' }, 'error'),
        ),
      ]),
    ),
  ];
  const issueCount = model.conflicts.length + model.errors.length;
  const issuesCard =
    issueCount > 0
      ? h(
          'div',
          { class: 'hv-card' },
          cardHead('var(--amber)', 'ISSUES', h('span', { class: 'hv-meta', style: 'color:var(--amber);' }, `${issueCount} — check exits 1`)),
          ...issueRows,
        )
      : null;

  const violationsCard = h(
    'div',
    { class: 'hv-card' },
    h(
      'div',
      { class: 'adv-label arch-adv-label' },
      `VIOLATIONS · ${model.advisories.length}`,
      h('span', { class: 'arch-adv-note' }, 'observed imports vs declared rules — advisory severity'),
    ),
    ...(model.advisories.length > 0
      ? model.advisories.map((v) =>
          h(
            'div',
            { class: 'vl-row' },
            ring(),
            h('span', { class: 'vl-edge' }, `${v.from} → ${v.to}`),
            h('span', { class: 'vl-msg' }, h('span', { class: 'arch-strong' }, v.file), ` imports "${v.specifier}"`),
            h('span', { class: 'vl-dec' }, idChip(ctx.byId, v.id, ctx)),
          ),
        )
      : [
          h(
            'div',
            { class: 'hv-empty' },
            h('span', { style: 'color:var(--green);' }, '✓'),
            ' observed imports respect every advisory-severity constraint',
          ),
        ]),
  );

  const conflictedPairs = new Set(model.conflicts.map((c) => `${c.from}\x00${c.to}`));
  const constraintRows = model.rules
    .filter((rule) => !conflictedPairs.has(`${rule.from}\x00${rule.to}`))
    .map((rule) => {
      const tier = edgeTier(model, rule.from, rule.to);
      const count =
        model.errors.filter((v) => v.from === rule.from && v.to === rule.to).length +
        model.advisories.filter((v) => v.from === rule.from && v.to === rule.to).length;
      return h(
        'div',
        { class: 'cn-row' },
        h('span', { class: 'cn-edge' }, `${rule.from} → ${rule.to}`),
        h('span', { class: rule.allowed ? 'cn-verdict cn-verdict-ok' : 'cn-verdict' }, rule.allowed ? 'allowed' : 'forbidden'),
        sevBadge(rule.severity ?? 'advisory'),
        idChip(ctx.byId, rule.decisionId, ctx),
        count > 0
          ? h('span', { class: 'cn-obs' }, tier === 'error' ? errDot() : ring(), `${count} observed`)
          : null,
      );
    });
  const conflictNotes = model.conflicts.map((c) =>
    h('div', { class: 'cn-row arch-cn-conflict' }, `${c.from} → ${c.to} — in conflict, see the ISSUES card`),
  );
  const constraintsCard = h(
    'div',
    { class: 'hv-card' },
    cardHead('var(--t-dec)', 'CONSTRAINTS', `${model.rules.length} compiled rules`),
    ...(constraintRows.length + conflictNotes.length > 0
      ? [...constraintRows, ...conflictNotes]
      : [h('div', { class: 'hv-empty' }, 'no active decision carries architecture constraints')]),
  );

  const wf = ctx.snap.documents.find((d) => d.type === 'workflow');
  const modulesCard = h(
    'div',
    { class: 'hv-card' },
    cardHead('var(--secondary)', 'MODULES', `${model.modules.length} declared`),
    ...model.modules.map((entry) =>
      h(
        'div',
        { class: 'md-row' },
        h('span', { class: 'md-name' }, entry.name),
        h('span', { class: 'md-path' }, entry.path),
        h('span', { class: 'md-purpose' }, entry.purpose),
      ),
    ),
    h(
      'div',
      { class: 'arch-card-foot' },
      `declared on the workflow frontmatter — editing the list moves it out from under its approval stamp (DEC-059)`,
      wf !== undefined
        ? h(
            'button',
            {
              class: 'btn-reset arch-go',
              fkey: 'arch-wf',
              onClick: (e) => ctx.openDoc(wf.id, { preview: true, background: e.metaKey || e.ctrlKey }),
            },
            'workflow ↗',
          )
        : null,
    ),
  );

  return [latticeCard(ctx, model), ...(issuesCard !== null ? [issuesCard] : []), violationsCard, constraintsCard, modulesCard];
}

// ---- The view -------------------------------------------------------------

export function architectureView(ctx: Ctx): HTMLElement {
  const model = archModel(ctx.snap);
  const tab = ctx.state.archTab;
  const seg = h(
    'div',
    { class: 'arch-seg', role: 'tablist', label: 'Architecture tabs' },
    ...(['map', 'rules'] as const).map((key) =>
      h(
        'button',
        {
          class: tab === key ? 'btn-reset arch-seg-btn arch-seg-on' : 'btn-reset arch-seg-btn',
          role: 'tab',
          selected: tab === key,
          fkey: `arch-seg:${key}`,
          onClick: () => ctx.update({ archTab: key }),
        },
        key === 'map' ? 'Map' : 'Rules',
      ),
    ),
  );
  let body: HTMLElement[];
  if (model.modules.length === 0) {
    // No registry: the one card mirroring the CLI hint (SRC-036 empty state).
    body = [
      h(
        'div',
        { class: 'hv-card' },
        cardHead('var(--faint)', 'NO MODULES DECLARED', null),
        h(
          'div',
          { class: 'hv-empty' },
          'The module registry is empty — add a modules: list (name, path, purpose) to the workflow frontmatter (DEC-059), and active decisions can constrain the edges between them (DEC-058).',
        ),
      ),
    ];
  } else if (tab === 'map') {
    const detail = detailPanel(ctx, model);
    body = [mapCard(ctx, model), ...(detail !== null ? [detail] : [])];
  } else {
    body = rulesTab(ctx, model);
  }
  const sub =
    tab === 'map'
      ? h('div', { class: 'arch-sub' }, 'the system as declared and as discovered — select a module to inspect it')
      : h('div', { class: 'arch-sub' }, 'dependency rules compiled from active decisions');
  return h(
    'div',
    { class: 'screen-arch' },
    h(
      'div',
      { class: 'hv-wrap' },
      h('div', { class: 'hv-head arch-head' }, h('h1', { class: 'hv-title' }, 'Architecture'), seg),
      sub,
      ...body,
    ),
  );
}
