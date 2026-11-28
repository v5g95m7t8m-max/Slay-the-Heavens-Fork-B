# Shop card chrome: initial-residency prototype

Source `32a15219`, generated production-model layout; temporary Fengari Host fixture, not original GIL rendering. Both arms keep the existing `deferHiddenShopProducts` behavior, watchdog and exact authored controls. The only A/B intervention defers cloning the seven shop cards' `stsReferenceChrome` visual subtrees until their first owning lookup. Stable semantic anchors are unchanged. No production code is modified by this experiment.

| Checkpoint | Baseline | Deferred |
| --- | ---: | ---: |
| Initial node-page control instances | 9,677 | 8,144 |
| After first card's chrome attaches | 9,677 | 8,363 |
| After all seven fill | 9,677 | 9,677 |

First product appeared in the same post-click update. The mouse and touchscreen tests matched on 80 frames of motion and visible-slot sequence, cold, settled and warm control projections (path, type, image identity, visibility, position, text, size, scale, rotation and color), and purchase: 70 gold, balance 10,000 → 9,930. Final equality digest: `55c075215ff4b7a1ae3bfaa36eb7d6ab8efb4e082b6d6eaca1c35dbf2a5e852a`. Scratch runner SHA-256: `52c1bc1c309efd06e949da15605a39a10aaec5be30bfc993b9cee424767b8fb2`.

**Follow-up GO only.** This is evidence of fewer initial mock instances, not retained bytes, CPU or native pixel equivalence. No reclamation proved after visiting the shop. The runtime-baseline fixture keeps the author's layout plus live clones; the native GIL generator does not embed those tracing-only Lua layout/template modules. The true platform's layout, template and texture residency remains unmeasured. A native template must attach before CardSkin's first probe: its negative cache otherwise preserves the missing binding. Run the native first and warm entry receipts, real pixels/clicks and cgroup resource comparisons before any request to integrate.
