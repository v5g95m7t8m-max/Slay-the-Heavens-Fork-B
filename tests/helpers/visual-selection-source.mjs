import assert from 'node:assert/strict';
import {beforeChapterBattleScene} from './chapter-battle-scene-source.mjs';
import {restoreExactFixtureHunks} from './exact-fixture-hunks.mjs';
import {currentRewardReplay} from './reward-current-source.mjs';
import {exactSourceMatches} from './source-fingerprint.mjs';

// The visual runtime stays current. These exact inverses are only inputs to
// the previously reviewed Selection source and test replays.
const legibility={
 "path": "tests/official-assets-legibility.test.mjs",
 "beforeSha256": "fbc764caacc457abba7e987e26890a6cdf7719957e0f125744673211c19702ae",
 "afterSha256": "43b97f299438c735bb3d88d3dc14fd8ee2b0cbc60002e34323dbc5cfecd4062e",
 "beforeBlob": "fc4c1ecfe989dc84312aece46dce303aedab4d97",
 "afterBlob": "7a5eac250ece22a13408d404e416e5fbb1ad30c1",
 "hunks": [
  {
   "at": 6,
   "before": "import {battleLayout} from '../scripts/ui-layout.mjs';\nimport {deckCardTemplate} from '../scripts/deck-ui-layout.mjs';",
   "after": "import {battleLayout} from '../scripts/ui-layout.mjs';\nimport {chapterBattleScenes,chapterBattleSceneHost} from '../scripts/v220-chapter-battle-scenes.mjs';\nimport {deckCardTemplate} from '../scripts/deck-ui-layout.mjs';"
  },
  {
   "at": 195,
   "before": "});\ntest('measured type frames share one native pool and preserve original illustration identities',()=>{",
   "after": "});\ntest('chapter artwork publishes a single bounded pool for the official stage',()=>{\n const layout=gameLayout(),theme=officialAssetsTheme(nativeTheme);\n const plan=chapterBattleScenes(theme);\n applyOfficialAssets([layout],theme,{chapterScenes:plan});\n const stage=child(layout,'stage')??layout,battle=child(stage,'battlePanel');\n const scene=child(battle,chapterBattleSceneHost);\n assert.deepEqual(child(battle,'hero').position,[-324,-35]);\n assert.deepEqual(child(battle,'notice').position,theme.layout.battleNotice.position);\n assert.deepEqual(theme.layout.player.groundedStatusLane,[-168,42]);\n assert.equal(theme.layout.enemyRow.groundContact.feet.blue_guard,47/106);\n assert.equal(theme.layout.enemyRow.groundContact.feet.sentry,undefined);\n assert.equal(theme.layout.enemyRow.groundContact.feet.champ,48/106);\n assert.equal(Object.keys(theme.layout.enemyRow.groundContact.feet).length,33);\n assert(Object.values(theme.layout.enemyRow.groundContact.footprints).every(footprints=>footprints.length<=2));\n assert(!child(battle,'v25BattleScene')&&!child(battle,'lowpolyScene'));\n assert.equal(children(battle)[0],scene,'scene paints behind battle interaction');\n assert.equal(children(scene).length,5);\n assert(children(scene).every(batch=>children(batch).length<=60));\n assert.equal(all(scene).length,256);\n assert.deepEqual(plan.rows.map(rows=>rows.filter(Boolean).length),[229,249]);\n const slots=all(scene).filter(node=>node.kind==='image');\n assert.equal(slots.length,250);\n assert.equal(slots.filter(node=>node.visible===false).length,21);\n for(const rows of plan.rows)for(const [i,row]of rows.entries()){\n  if(row)assert.equal(row[0]>100006,slots[i].image>100006,'one renderer family per native slot');\n }\n});\ntest('measured type frames share one native pool and preserve original illustration identities',()=>{"
  }
 ]
};

const viewport={
 "path": "src/lua/abyss_viewport.lua",
 "beforeSha256": "d65c7b5a8486d0affb2e2e662654332ad85e6c320b3285971462643703bcef25",
 "afterSha256": "b98dd4805adff9df17b22bf568d42d25a7bb360644a84f4ccc5afc75287977df",
 "beforeBlob": "b709aa74c5315876429bf51bec33615a16077c91",
 "afterBlob": "41cb4484415609d3ebd016f140619a1f457c7b1c",
 "hunks": [
  {
   "at": 31,
   "before": "\nfunction M.apply(root, width, height, mobile)",
   "after": "\nlocal cardWidth, cardHeight = table.unpack(Theme.layout.card.size)\nlocal hand = Theme.layout.hand\nlocal card = Theme.layout.card\nlocal disc = card.costDisc\nlocal ring = math.max(disc + card.trim.costRing, Theme.layout.nativeText.lineHeight) / 2\nlocal cardLeft = math.max(cardWidth / 2, cardWidth / 2 - disc / 2 + card.trim.costOverhang + ring)\nlocal cardTop = math.max(cardHeight / 2, cardHeight / 2 - disc / 2 + card.trim.costOverhang + ring,\n    card.title.position[2] + math.max(card.nameBand, Theme.layout.nativeText.lineHeight) / 2) + Theme.space.border\n\nfunction M.handSpacing(count, extraWidth)\n    if count <= 1 then return 0 end\n    -- The side controls keep the remaining space as they move to the edges.\n    local width = hand.maxWidth + math.max(0, extraWidth or 0) / 2\n    return math.max(hand.spacingMin, math.min(hand.spacingMax, (width - cardWidth) / (count - 1)))\nend\n\nfunction M.handSlot(count, index, extraWidth)\n    local spacing = M.handSpacing(count, extraWidth)\n    local distance = index - (count - 1) / 2\n    local angle = -distance * hand.arcDegrees\n    local radians = math.abs(angle) * math.pi / 180\n    local halfHeight = (cardHeight * math.cos(radians) + cardWidth * math.sin(radians)) / 2\n    local floor = -baseHeight / 2 + Theme.canvas.safe.y + halfHeight - (hand.overhang or 0)\n    return distance * spacing, math.max(floor, hand.y - math.abs(distance) * hand.arcDrop), angle, spacing\nend\n\nfunction M.limitHandFocus(y, angle, scale, ceiling)\n    if not ceiling then return y end\n    local radians = math.abs(angle) * math.pi / 180\n    local top = cardTop * math.cos(radians) + cardLeft * math.sin(radians)\n    return math.min(y, ceiling - top * scale)\nend\n\nfunction M.handFocus(baseY, x, health)\n    local scale = Theme.motion.hoverScale\n    local y = math.max(baseY + Theme.motion.hoverLift, -baseHeight / 2 + Theme.canvas.safe.y + cardHeight * scale / 2)\n    if not health then return y, scale end\n    local ceiling\n    for _, bar in ipairs(health) do\n        if x + cardWidth * scale / 2 > bar.left and x - cardLeft * scale < bar.right then\n            ceiling = math.min(ceiling or bar.bottom, bar.bottom)\n        end\n    end\n    if ceiling and y + cardTop * scale > ceiling then\n        -- Keep the whole reading face on screen under the nearby enemy health.\n        local height = ceiling + baseHeight / 2 - Theme.canvas.safe.y\n        if height > 0 then\n            scale = math.min(scale, height / (cardTop + cardHeight / 2))\n            return M.limitHandFocus(y, 0, scale, ceiling), scale, ceiling\n        end\n    end\n    return y, scale\nend\n\n-- Keep the authored launch/landing offset inside each icon at 16:9. The\n-- generated native anchors determine how both the icon and its motion move.\nfunction M.pileLayout(panel)\n    local layout = Theme.layout\n    local origin = {\n        draw = layout.drawPile.position,\n        discard = layout.discardPile.position,\n        exhaust = {layout.topBar.exhaustIcon[1], layout.topBar.y},\n    }\n    local holder = panel and panel.anchorMinX == 0 and panel.anchorMaxX == 1 and panel.parent\n    local anchors = {}\n    if holder then\n        for pile in pairs(origin) do\n            local icon = panel:GetChild(pile .. \"Icon\")\n            anchors[pile] = icon and icon.anchorMinX\n        end\n    end\n    local function extraWidth()\n        if not holder then return 0 end\n        return (holder.sizeDeltaX or baseWidth) + (panel.sizeDeltaX or 0) - baseWidth\n    end\n    local function point(pile, extra)\n        local base = origin[pile]\n        if base then return base[1] + ((anchors[pile] or .5) - .5) * extra, base[2] end\n    end\n    return { extraWidth = extraWidth, point = point }\nend\n\nfunction M.apply(root, width, height, mobile)"
  }
 ]
};

const architecture='config/architecture.json';
const actorMotion='src/lua/abyss_actor_motion.lua';
const rewardOwners=new Set([
 architecture,
 'src/lua/abyss_battle_card_gestures.lua',
 'src/lua/abyss_battle_card_layout.lua',
 'src/lua/abyss_battle_card_view.lua',
 'src/lua/abyss_battle_details.lua',
 'src/lua/abyss_battle_render_actors.lua',
 'src/lua/abyss_battle_ui.lua',
 'src/lua/abyss_game_ui.lua',
 'src/lua/abyss_game_ui_view.lua',
 'src/lua/abyss_node_ui.lua',
]);

function beforeVisualFixture(proof,path,source){
 if(path!==proof.path||typeof source!=='string')return source;
 const lf=source.replaceAll('\r\n','\n');
 const crlf=source!==lf;
 if(crlf&&source!==lf.replaceAll('\n','\r\n'))return source;
 if(!exactSourceMatches(lf,{sha256:proof.afterSha256,gitBlob:proof.afterBlob}))return source;
 const prior=restoreExactFixtureHunks(proof,path,lf);
 assert(exactSourceMatches(prior,{sha256:proof.beforeSha256,gitBlob:proof.beforeBlob}),'exact visual predecessor: '+path);
 return crlf?prior.replaceAll('\n','\r\n'):prior;
}

export function beforeVisualLegibility(path,source){
 return beforeVisualFixture(legibility,path,source);
}

export function visualSelectionOwnerRead(read){
 let rewardRead;
 const readReward=(path,encoding='utf8')=>{
  const raw=read(path,encoding);
  if(path===architecture)
   assert.notEqual(beforeChapterBattleScene(path,raw),raw,'fresh reviewed Selection production owner: '+path);
  return raw;
 };
 return (path,row)=>{
  if(rewardOwners.has(path)){
   if(!rewardRead){
    const config=readReward(architecture,'utf8');
    const reward=currentRewardReplay(architecture,config,readReward);
    assert.notEqual(reward.source,config,'fresh reviewed Selection production owner: '+architecture);
    rewardRead=reward.read;
   }
   const prior=rewardRead(path);
   assert(exactSourceMatches(prior,row.before),'exact visual reward predecessor: '+path);
   return row.before.source;
  }
  const raw=read(path,'utf8');
  let source=raw;
  if(path===actorMotion||path===viewport.path){
   source=path===actorMotion?beforeChapterBattleScene(path,raw):beforeVisualFixture(viewport,path,raw);
   assert.notEqual(source,raw,'fresh reviewed Selection production owner: '+path);
  }
  assert(exactSourceMatches(source,row.after),'fresh reviewed Selection production owner: '+path);
  return row.before.source;
 };
}
