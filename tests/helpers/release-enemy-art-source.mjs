// Exact single-owner release bug continuation. Prior packets and targets remain immutable.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const bytes=readFileSync(new URL('./release-enemy-art-source.json.gz',import.meta.url));
assert.equal(hash(bytes),'b2c17392b591bc57ec0f8de9236cfc862d74fcfef76d13261baa746966e411a4','complete release enemy art source packet');
export const releaseEnemyArtSourcePacket=freeze(JSON.parse(gunzipSync(bytes)));
export function extendReleaseEnemyArtSource(original,packet=releaseEnemyArtSourcePacket){
 assert.deepEqual(packet,releaseEnemyArtSourcePacket,'exact complete release enemy art packet');
 assert.equal(packet.schemaVersion,1);assert.equal(packet.normalization,'LF');
 assert.equal(packet.baseCommit,'33d71575c5f186a1b54f7bf3e4f1826c145aa1d9');
 assert.equal(packet.currentTreeCommitted,false,'honest uncommitted source capture');
 const prior=original.proof,paths=Object.keys(packet.current);
 assert.deepEqual(paths,['src/lua/abyss_lowcost_art.lua'],'only existing shape rotation owner advances');
 assert.deepEqual(Object.keys(packet.before),paths);
 for(const path of paths){assert.deepEqual(packet.before[path],prior.current[path],'exact full predecessor');assert.notEqual(packet.current[path].sha256,packet.before[path].sha256);}
 assert(!Object.hasOwn(prior.targets,'releaseEnemyArtPrior'));
 const current={...prior.current,...packet.current};
 const targets={...prior.targets,releaseEnemyArtPrior:{commit:packet.baseCommit,files:prior.current}};
 const owners=Object.keys(current).sort().filter(path=>Object.values(targets).some(t=>t.files[path]?.sha256!==current[path]?.sha256));
 return createSourceEpochProjector(freeze({...prior,current,targets,owners,currentTreeCommitted:false,currentCommit:packet.currentCommit,
 currentCommitRole:'uncommitted exact release enemy rotation bugfix capture; runtime and device acceptance remain independent'}),{allowConfigLayout:true,reuseFrozenInput:true});
}
// Test-only historical reads: unknown bytes are never hidden or authorized.
export function preReleaseEnemyArtSource(path,source){
 const row=Object.hasOwn(releaseEnemyArtSourcePacket.current,path)?releaseEnemyArtSourcePacket.current[path]:null;
 if(!row||typeof source!=='string'||source.includes('\r\r\n')||hash(source.replaceAll('\r\n','\n'))!==row.sha256)return source;
 return releaseEnemyArtSourcePacket.before[path].source;
}
