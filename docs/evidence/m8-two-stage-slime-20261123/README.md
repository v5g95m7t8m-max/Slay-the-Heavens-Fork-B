# TASK-16.1.6: two-stage split control bounds

Pinned upstream Develop: `73c21489efaab409d4c0c46bee517d410d3427fc`. Additive evidence only. Do not merge this evidence branch into Develop or Release.

The Host fixture binds the generated default controls, replaces its encounter with a deterministic Slime Boss combat, and lowers HP through the real combat damage function to exercise the two split stages. A Boss splits into the two large slimes; those split into four medium slimes. The original living actor IDs remain associated with distinct visible controls, HP text and intent; all three retired parents have no surface after feedback settles. Minimum adjacent horizontal hitbox gap: 44.67 design units (33.50 uniformly scaled units at 960×720). At 1280×720 the leftmost callback damages only its actor; at 960×720 the rightmost callback likewise. Both sets of printed bounds are 1280-unit design-space coordinates, not physical pixels.

The negative case changes only the in-memory split-position resolver during the large-to-medium stage, making sibling origins coincide. It fails the overlap assertion; no source code or test assertion was changed to pass. A separate reviewer reran both controls. The existing acid and spike split UI regressions passed; acid combat 15/15 and spike combat 18/18 passed. Regenerated Lua data, default UI and map artifacts after checking 882 materialized input blobs against Develop. This is not a natural encounter run, visual sprite/animation capture, pointer hit routing, official-client import, PC or mobile device acceptance. The Backlog device gate remains open.

From that exact checkout with dependencies installed, use the following commands. The diagnostic script can be read from this evidence directory while CWD remains the checkout root.

```sh
npm run build:data && npm run build:ui && node scripts/map-ui-layout.mjs
node node_modules/fengari-node-cli/src/lua-cli.js -e 'dofile("docs/evidence/m8-two-stage-slime-20261123/two-stage-slime-proof.lua")'
# Expected to fail specifically at the overlap assertion:
node node_modules/fengari-node-cli/src/lua-cli.js -e 'ABYSS_TEST_COLLISION=true; dofile("docs/evidence/m8-two-stage-slime-20261123/two-stage-slime-proof.lua")'
```
