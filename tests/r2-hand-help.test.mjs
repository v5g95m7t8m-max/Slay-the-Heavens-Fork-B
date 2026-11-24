import test from 'node:test';
import assert from 'node:assert/strict';
import {runLua} from '../scripts/test-lua.mjs';
test('held cards read on their own face with only genuine keywords and owned release',()=>{
 const r=runLua('tests/lua/r2_hand_help.lua');
 assert.equal(r.status,0,r.stdout+r.stderr);
 assert.match(r.stdout,/R2_HAND_HELP_PASS/);
});

test('release catalogue fits complete printed and combat text across shared default faces',()=>{
 const r=runLua('tests/lua/card_body_catalog.lua',{timeout:120000});
 assert.equal(r.status,0,r.stdout+r.stderr);
 assert.match(r.stdout,/CARD_BODY_CATALOG_PASS 368 cards, 2944 versions, 9568 face checks/);
});

test('true overflow uses the existing large card and owns its closing touch',()=>{
 const r=runLua('tests/lua/card_body_focus.lua');
 assert.equal(r.status,0,r.stdout+r.stderr);
 assert.match(r.stdout,/CARD_BODY_FOCUS_PASS/);
});
