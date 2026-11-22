import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {applyV25MenuLayout} from '../scripts/v25-menu-layout.mjs';
import {applyApprovedNativeMenu,nativeMenuFrames} from '../scripts/native-menu-approved-layout.mjs';
const kids=n=>n.children??n.controls??[],all=n=>[n,...kids(n).flatMap(all)];
test('STS1 menu retains transactions, unplated resting controls and four states',()=>{
 const layout=gameLayout();applyV25MenuLayout(layout,nativeTheme);
 const menu=all(layout).find(n=>n.name==='menuPanel');
 const start=kids(menu).find(n=>n.name==='start'),hit=kids(start).find(n=>n.name==='hit');
 applyApprovedNativeMenu(menu);
 assert.equal(kids(start).find(n=>n.name==='hit'),hit,'do not replace input transaction');
 const title=all(menu).find(n=>n.name==='sts1TitleLogo');assert(title,'new painted logo is installed');
 for(const name of ['start','titleQuit','continueRun']){
  const button=kids(menu).find(n=>n.name===name),face=kids(button).find(n=>n.name==='v25MenuFace');
  assert.deepEqual(kids(face).map(n=>n.name),['normal','hover','pressed','disabled']);
  assert.equal(kids(face)[0].children.length,0,'resting text has no plate');
  assert(kids(face)[1].children.length>0,'hover has warm highlight');
  assert(kids(face)[2].children.length>0,'pressed is distinct');
  const [x,y,w,h]=[...button.position,...button.size];
  assert(x-w/2>=-600&&x+w/2<=600&&y-h/2>=-340&&y+h/2<=340);
 }
 assert.equal(nativeMenuFrames.start[0],-464);
 assert.equal(kids(start).find(n=>n.name==='label').text.content,'开始游戏');
 const scene=all(menu).find(n=>n.name==='menuRedBackground');
 assert(all(scene).filter(n=>n.kind==='image').length<1100);
 assert(all(title).filter(n=>n.kind==='image').length<=660);
 for(const n of all(scene)){assert(kids(n).length<=60);if(n.kind==='image')assert([100001,100003].includes(n.image));}
});

import {beforeRebasedRelease} from './helpers/rebased-release-source.mjs';
import {beforeSts1MenuCiSource} from './helpers/sts1-menu-ci-source.mjs';
import {beforeNativeFlowFixture} from './helpers/native-flow-fixture-source.mjs';
test('menu historical source continuation projects only exact complete new test bytes',()=>{
 const path='tests/official-assets.test.mjs',source=readFileSync(path,'utf8');
 const project=(path,input)=>beforeSts1MenuCiSource(path,beforeRebasedRelease(path,beforeNativeFlowFixture(path,input)));
 const prior=project(path,source);assert.notEqual(prior,source);
 assert.equal(project(path,source+'\n'),source+'\n');
 assert.equal(project('tests/foreign.mjs',source),source);
 assert.equal(project(path,null),null);
 const toCrlf=value=>value.replace(/\r?\n/g,'\r\n');
 assert.equal(project(path,toCrlf(source)),toCrlf(prior));
 const malformed=toCrlf(source).replace('\r\n','\r\r\n');
 assert.equal(project(path,malformed),malformed,'double CR must remain unrecognized');
});
