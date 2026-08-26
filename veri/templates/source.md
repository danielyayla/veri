
(Imported source. Paste or link the original material.)

(If this source is outcome evidence — reality reporting back on a
shipped change: metrics, user feedback, a follow-up investigation —
link it in frontmatter to the requirement it reports on and to the
work order that shipped the change, e.g.

```yaml
links:
  - id: REQ-042
    rel: supports   # or tests / refutes
  - id: WO-107
    rel: outcome-of
```

`tests`/`supports`/`refutes` point at the requirement — usually a
`kind: hypothesis` bet this evidence settles — and `outcome-of` points
at the work order. The evidence then travels in the requirement's
context package, and the hypothesis stops being an untested bet.)
