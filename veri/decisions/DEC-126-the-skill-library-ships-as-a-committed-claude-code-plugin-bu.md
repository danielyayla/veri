---
id: DEC-126
type: decision
title: "The skill library ships as a committed Claude Code plugin built from a host-neutral core, served by npx @verikb/mcp"
status: withdrawn
created: 2026-08-27
updated: 2026-08-27
links:
  - id: SRC-061
    rel: derived-from
  - id: SRC-060
    rel: informed-by
  - id: REQ-040
    rel: constrains
  - id: REQ-041
    rel: constrains
  - id: DEC-069
    rel: diverges-from
  - id: DEC-075
    rel: consistent-with
  - id: DEC-111
    rel: consistent-with
  - id: REQ-008
    rel: constrained-by
---

## Withdrawn in favour of [[DEC-125]]

This decision was filed concurrently with [[DEC-125]] from the same route
document ([[SRC-061]]), by a session that had not seen it, and reached the
opposite answer on content ownership. [[DEC-125]] stands: the coaching method
lives in `veri/` as Veri documents, with generated harness-native shells as
thin pointers, per [[DEC-018]].

The text below is kept unedited because the two disagreed on a real question
and the reasoning is worth reading. Its mechanical conclusions — capability
probing over the tool list, refusing rather than degrading, writing nothing at
install time, no new `v*` tag claimant, `veri` as the user-facing name — were
carried into [[DEC-125]] and hold there. Its content-ownership and carrier
claims do not.

## Choice

The fourteen skills of [[SRC-060]] are authored once as host-neutral markdown bodies in `packages/skills`, whose only Veri dependency is MCP tool calls — never shelling out to the CLI, never reading `veri/` off disk. A thin per-host adapter builds a Claude Code plugin from those bodies; the built plugin is **committed** to the repo, and CI proves it current by rebuilding and diffing (`git diff --exit-code`), exactly as `action/dist` is guarded under [[DEC-069]]. Claude Code is the only host packaged in v1.

Distribution is referential, not generative: the plugin stays external and versioned rather than being copied into the user's project. It reaches users from Veri's own marketplace — a `.claude-plugin/marketplace.json` in `danielyayla/veri`, whose entry pins `source: {source: "git-subdir", url, path, ref, sha}`. Updating that sha *is* the release: the plugin claims no share of the `v*` tag namespace and [[DEC-075]]'s guard job is untouched. A listing in `claude-plugins-official` is a later, separate act.

All fourteen skills ship as **one** plugin named `veri`, with `veri:` as the skill prefix and [[SRC-060]]'s default/advanced split expressed in skill descriptions rather than as an install boundary. `veri` is the user-facing name throughout; `@verikb` stays a registry-scope artifact and does not propagate into anything a user types.

The plugin's bundled `.mcp.json` points at `npx -y @verikb/mcp` rather than carrying a committed server bundle, so the server moves independently of the skills. Skills declare the MCP capabilities they require and check by **probing the tool list** MCP already sends at connect; `serverInfo.version` is consulted only where a tool's behavior rather than its existence changed. When a required tool is absent, stale, or the server is missing, a skill **refuses with a named repair instruction** and never degrades to coaching it cannot file.

The library is Veri's front door, so it must work in a repo with no `veri/` directory. Nothing is written at install time: installing a plugin is a statement of interest, not consent to restructure a repository. The first skill invocation asks before it initializes, and scaffolds through an `init` MCP tool rather than duplicating `packages/core/src/scaffold.ts`.

## Consequences this decision creates

1. **npm publishing becomes a hard prerequisite, not a chore.** `npx @verikb/mcp` cannot resolve until the packages are actually published; the 2FA/OIDC trusted-publishing conversion now blocks the front door.
2. **[[REQ-041]] gains a fifth item** — an `init` MCP tool. It is still `draft`, so this is an amendment rather than a new requirement.
3. **[[REQ-041]]'s first three gaps stop being nice-to-have.** A skill restricted to MCP calls cannot run a health sweep without `list_documents`; the read-only gaps become blocking for the skills that need them.

## Rejected alternatives

- **Generative distribution — copy the skills into the project at init, as [[WO-091]] does for starter bundles** — right for starter *documents*, which are seed intent the owner rewrites into their own canon, but wrong for skills: skills are Veri's canon and encode [[WF-001]]'s rules, so copying forks the coaching text per project and strands every project ever initialized the moment the workflow changes. This is the canon-duplication rot arriving through the distribution door.
- **A committed MCP server bundle inside the plugin, per [[DEC-069]]** — DEC-069 committed a bundle because GitHub fetches an action's repo without installing anything; that constraint is the runner's and does not apply to plugin users, who have Node and a network. Bundling would pin every installation to the server current at plugin-release time, contradicting the capability-declaration contract that requires the server to move independently.
- **Shelling out to the `veri` CLI, or reading `veri/` off disk** — makes every host need a shell and a global install, and forfeits the portability that MCP already provides; reading files directly would also bypass the id machinery and the `draft`/`proposed` guarantees [[REQ-008]] rests on.
- **Two plugins, splitting [[SRC-060]]'s eight defaults from its six advanced skills** — doubles the release surface and the version-skew problem, and buys the user nothing: skills are inert until invoked, so an unused advanced skill costs a description line, not a running process.
- **Making the Claude Code plugin the product rather than one packaging** — a second host would become a rewrite once fourteen skill bodies had plugin-specific assumptions baked in. Structuring for the adapter costs nearly nothing and CI's rebuild-and-diff gives the host-neutral core a real job on day one.
- **Building a second host adapter in v1** — speculative; no one has asked, and the structure preserves the option.
- **Listing in `claude-plugins-official` as part of this decision** — couples shipping to a submission review and to the pre-ship quality bar, which is a separate open decision; an unbuilt eval suite would block an otherwise-ready plugin.
- **A dedicated MCP capabilities tool** — a second source of truth about what the server can do, when the tool list already is that truth.
- **Lockstep versioning between skills and `@verikb/*`** — unenforceable across the marketplace boundary; a project pinning an older server cannot be made to upgrade, so the contract has to be declared and checked rather than assumed.
- **Claiming a `v*` tag for plugin releases** — a third claimant on a namespace [[DEC-075]]'s guard job already disambiguates twice, for no user-visible benefit, since marketplace consumers resolve by ref and sha.
- **Scaffolding `veri/` at install time** — writes into whatever project happened to be open; cuts against [[REQ-008]] and [[DEC-111]], where the user's acts are explicit.
- **Degrading to coaching when the server is unavailable** — produces the worst artifact in the system: durable-feeling intent that exists only in a transcript, with no id, no status, and no place in the graph.

## Rationale

Origin: a wayfinding grilling session over the first frontier item of [[SRC-061]], which merged the distribution and host-portability questions once it became clear they were one decision.

The through-line is that **MCP, not the skill format, is the portable substance**. Once the skills may only touch Veri through MCP tool calls, "which hosts can run this" becomes "which hosts speak MCP" — a larger and faster-growing set than "which hosts implement Claude Code's skill format" — and a host's skill format is reduced to a wrapper an adapter can generate. That single choice cascades: it makes the host-neutral core worth having, makes capability probing the right compatibility check, makes an `init` MCP tool necessary rather than optional, and makes refusing-on-absence the only honest failure mode.

The two divergences from [[DEC-069]] are deliberate and are recorded because a future reader will otherwise read them as drift. DEC-069's committed bundle answered a constraint — GitHub Actions fetches an action's repo without installing anything — and that same constraint applies to the *plugin* (marketplace installs fetch a repo at a sha), so the plugin is committed and diff-guarded. It does **not** apply to the *server*, which plugin users can fetch via npx, so the server is not bundled. Same precedent, opposite answers, because the precedent was never about committing artifacts for its own sake; it was about what the consumer can be assumed to do at fetch time.

Referential rather than generative distribution is the load-bearing choice for the library's decade, not its launch. [[WO-091]]'s copy-and-forget shape is correct for documents the owner takes ownership of; skills are the opposite, and the failure it prevents — every project silently pinned to the workflow text current at its init — is exactly the decay [[SRC-061]] named as the effort's largest long-term risk.

Treating the library as Veri's front door ([[DEC-111]]: the system of record for product intent) is what forces the bare-repo and install-time questions. [[REQ-040]]'s refuting outcome is skills invoked once and abandoned, and the moment most likely to produce abandonment is the blank page — which is precisely the Discover gate the library exists to staff.
