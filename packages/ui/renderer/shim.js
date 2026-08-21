// window.veri shim (WO-073, DEC-063): the preload.mts surface, verbatim,
// backed by Tauri invoke → Rust shell → Node sidecar instead of Electron
// IPC. Shapes are documented in src/renderer/api.ts (VeriApi); the renderer
// must not be able to tell which shell hosts it (SRC-038), so every method
// resolves and rejects exactly as the Electron bridge did — rejections carry
// the sidecar's own error text, which ipcErrorMessage passes through.
//
// Ships unbundled next to index.html: plain script, no imports, loaded
// before app.bundle.js so window.veri exists when the renderer boots.
(function () {
  'use strict';
  const inv = (cmd, args) => window.__TAURI__.core.invoke(cmd, args);
  const call = (method, ...params) => inv('veri_call', { method, params });
  const listen = (event, cb) => {
    void window.__TAURI__.event.listen(event, cb);
  };

  // Theme (WO-060): the shell resolves the preference before the window
  // exists (background color + ?theme=light on the URL), and keeps the
  // WebView's own appearance in step with the pref — an explicit Light/Dark
  // pins it, System tracks the OS. The media query therefore always reflects
  // the *resolved* mode; pref-aware resolution below is belt and braces for
  // the frames between a themeSet and the shell's apply_theme landing.
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  let themePref = 'system';
  const resolveDark = () => (themePref === 'system' ? media.matches : themePref === 'dark');
  let themeCb = null;
  media.addEventListener('change', () => {
    // OS flip under System, or the shell repinning the WebView appearance.
    // The renderer applies resolved-theme events idempotently.
    if (themeCb !== null) themeCb(resolveDark());
  });

  // Project switches reload the page (Electron's pointAppAt did the same via
  // loadFile); anything the reopened window must know rides the query string.
  const reloadIntoProject = (notice) => {
    const q = new URLSearchParams();
    if (!resolveDark()) q.set('theme', 'light');
    if (notice !== undefined) q.set('notice', notice);
    const query = q.toString();
    history.replaceState(null, '', location.pathname + (query === '' ? '' : '?' + query));
    location.reload();
  };

  let bootedSent = false;

  window.veri = {
    snapshot: async () => {
      const snap = await call('snapshot');
      if (!bootedSent) {
        // First snapshot delivered — the shell's cue that the app is up
        // (startup log line, screenshot-harness timing).
        bootedSent = true;
        requestAnimationFrame(() => {
          void inv('booted');
        });
      }
      return snap;
    },
    context: (id) => call('context', id),
    paletteSearch: (query, recents) => call('palette-search', query, recents),
    workspaceLoad: () => call('workspace-load'),
    workspaceSave: (state) => call('workspace-save', state),
    copyText: (text) => inv('copy_text', { text }),
    setStatus: (id, status) => call('set-status', id, status),
    readDoc: (file) => call('read-doc', file),
    saveDoc: (file, text) => call('save-doc', file, text),
    createDoc: (type, title) => call('create-doc', type, title),
    templateRead: (type) => call('template-read', type),
    templateWrite: (type, body) => call('template-write', type, body),
    templateReset: (type) => call('template-reset', type),
    appendNote: (id, note) => call('append-note', id, note),
    setLinks: (id, links) => call('set-links', id, links),
    approve: (id) => call('approve', id),
    reviewNote: (id, note) => call('review-note', id, note),
    mcpStatus: () => call('mcp-status'),
    mcpSetup: () => call('mcp-setup'),
    mcpFixRoot: () => call('mcp-fix-root'),
    runtimeProbe: () => call('runtime-probe'),
    verifyConnection: () => call('verify-connection'),
    // Welcome screen's "Open an existing folder" (SRC-013): one picker, no
    // dialog loop — a bad pick comes back named so the screen can say so.
    welcomeOpen: async () => {
      const dir = await inv('pick_folder', { title: 'Open a Veri project' });
      if (dir === null) return null; // cancel returns to the welcome screen
      const cls = await call('classify-dir', dir);
      if (!cls.project) return { kind: 'not-a-project', dir };
      const err = await call('point-at', dir);
      if (err !== null) return { kind: 'error', message: err };
      reloadIntoProject();
      return { kind: 'opened' };
    },
    appInfo: () => call('app-info'),
    updateStatus: () => inv('update_status'),
    agents: () => call('agents'),
    agentLaunch: (id, binPath, prompt, setup) => call('agent-launch', id, binPath, prompt, setup),
    onMcpChanged: (cb) => listen('veri-mcp-changed', (e) => cb(e.payload && typeof e.payload.external === 'boolean' ? e.payload.external : true)),
    listRecentProjects: () => call('list-recent-projects'),
    switchProject: async (dir, notice) => {
      const err = await call('point-at', dir);
      if (err === null) reloadIntoProject(notice);
      return err;
    },
    openProjectFolder: async () => {
      const dir = await inv('pick_folder', { title: 'Select a project folder' });
      if (dir === null) return null;
      const err = await call('point-at', dir);
      if (err === null) reloadIntoProject();
      return err;
    },
    // New project (WO-018, SRC-007): the picker comes first — the directory
    // is the only required input — and a folder that already has veri/ is
    // reported back as existing so the renderer's dirty-buffer guard runs
    // before anything reloads (WO-058, DEC-052).
    newProjectPick: async () => {
      const dir = await inv('pick_folder', { title: 'Choose a folder for the new project', canCreate: true });
      if (dir === null) return null;
      if ((await call('classify-dir', dir)).project) return { kind: 'existing', dir };
      return { kind: 'new', dir, name: dir.split('/').pop() || dir };
    },
    createProject: async (dir, demo) => {
      const err = await call('create-project', dir, demo);
      if (err === null) reloadIntoProject();
      return err;
    },
    onChanged: (cb) => listen('veri-changed', () => cb()),
    themeGet: async () => {
      const { pref } = await call('theme-get');
      themePref = pref;
      return { pref, dark: resolveDark() };
    },
    themeSet: async (pref) => {
      await call('theme-set', pref);
      themePref = pref;
      // The shell repins the WebView appearance and the window background;
      // the direct callback covers the frame until that lands.
      void inv('apply_theme', { pref });
      const dark = resolveDark();
      if (themeCb !== null) themeCb(dark);
      return { pref, dark };
    },
    onThemeChanged: (cb) => {
      themeCb = cb;
    },
  };

  // Automated acceptance harness (WO-073, dev-only): the WO-071 spike's
  // VERI_SPIKE_EVAL pattern as a permanent fixture. Inert unless the shell
  // was launched with VERI_UI_ACCEPT=1; then it drives the representative
  // capabilities end to end and hands the evidence back for the harness to
  // print and exit on. Runs only against scratch projects the harness set up.
  window.addEventListener('load', async () => {
    const cfg = await inv('accept_mode');
    if (!cfg.enabled) return;
    const report = {};
    const step = async (name, fn) => {
      try {
        report[name] = { ok: true, value: await fn() };
      } catch (err) {
        report[name] = { ok: false, error: String(err) };
      }
    };
    // Let the app finish rendering its first snapshot.
    await new Promise((r) => setTimeout(r, 1500));
    report.rendered = {
      ok: document.querySelector('#app') !== null && document.querySelector('#app').children.length > 0,
      value: document.title,
    };

    let changedEvents = 0;
    listen('veri-changed', () => {
      changedEvents += 1;
    });

    await step('readDoc', async () => {
      const text = await window.veri.readDoc(cfg.doc);
      if (text === null || text.length === 0) throw new Error('unexpected content');
      return text.length + ' bytes';
    });
    await step('saveDoc', async () => {
      const before = await window.veri.readDoc(cfg.doc);
      await window.veri.saveDoc(cfg.doc, before + '\n<!-- WO-073 acceptance round-trip -->\n');
      const after = await window.veri.readDoc(cfg.doc);
      if (!after.includes('WO-073 acceptance round-trip')) throw new Error('edit not persisted');
      return 'guarded write persisted, ' + (after.match(/updated: [\d-]+/) || ['updated:?'])[0];
    });
    await step('saveGuard', async () => {
      const text = await window.veri.readDoc(cfg.doc);
      try {
        await window.veri.saveDoc(cfg.doc, text.replace(/^id: .*$/m, 'id: ZZZ-999'));
      } catch (err) {
        return 'id edit refused: ' + String(err).slice(0, 80);
      }
      throw new Error('id edit was not refused');
    });
    await step('watcherEvent', async () => {
      await new Promise((r) => setTimeout(r, 2000));
      if (changedEvents === 0) throw new Error('no veri-changed event after save');
      return changedEvents + ' change event(s) observed';
    });
    await step('projectSwitch', async () => {
      if (!cfg.alt) return 'skipped (no alt project)';
      const err = await call('point-at', cfg.alt);
      if (err !== null) throw new Error(err);
      const snap = await call('snapshot');
      const back = await call('point-at', cfg.main);
      if (back !== null) throw new Error(back);
      return 'switched to ' + snap.projectName + ' (' + snap.documents.length + ' docs) and back';
    });
    await step('theme', async () => {
      const before = await window.veri.themeGet();
      const flipped = await window.veri.themeSet(before.dark ? 'light' : 'dark');
      const restored = await window.veri.themeSet(before.pref);
      if (flipped.dark !== !before.dark) throw new Error('explicit pref did not flip resolved mode');
      return 'pref ' + before.pref + ' -> ' + flipped.pref + ' -> ' + restored.pref + ', dark ' + before.dark + ' -> ' + flipped.dark;
    });
    await step('mcpSetup', async () => {
      // The scratch project's config (if any) names another root; the real
      // one-click setup flow writes the correct entry for this project.
      await window.veri.mcpSetup();
      const s = await window.veri.mcpStatus();
      if (s.state !== 'ok') throw new Error('post-setup state ' + s.state);
      return 'wrote veri entry, status ok';
    });
    await step('mcpStatus', async () => {
      const s = await window.veri.mcpStatus();
      return s.state;
    });
    await step('agents', async () => {
      const list = await window.veri.agents();
      return list.map((a) => a.id + ':' + a.status).join(', ');
    });
    await step('verifyConnection', async () => {
      const v = await window.veri.verifyConnection();
      if (v.kind !== 'ok') throw new Error(JSON.stringify(v));
      return 'live MCP handshake ok, ' + v.toolCount + ' tools, searchProved=' + v.searchProved;
    });
    await step('updateStatus', async () => {
      const u = await window.veri.updateStatus();
      return JSON.stringify(u);
    });
    await inv('accept_report', { report });
  });
})();
