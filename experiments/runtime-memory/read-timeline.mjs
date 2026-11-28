// Pair diagnostic GC marks with the unmodified worker's actual phase labels.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const [logPath, timelinePath] = process.argv.slice(2);
assert(logPath && timelinePath, 'usage: read-timeline.mjs WORKER.log TIMELINE.json');
const prefix = 'RUNTIME_BASELINE_JSON ';
const records = readFileSync(logPath, 'utf8').split(/\r?\n/u).filter(line => line.startsWith(prefix));
assert.equal(records.length, 1, 'need exactly one successful Host report');
const {rows, maxRssKiB} = JSON.parse(records[0].slice(prefix.length));
const {node, timeOrigin, marks, gc} = JSON.parse(readFileSync(timelinePath, 'utf8'));
// Some Node tools can also call memoryUsage. Reject ambiguity rather than
// claiming a match by position alone.
const keys = ['rss', 'heapTotal', 'heapUsed', 'external', 'arrayBuffers'];
let pos = 0, end = 0;
const phases = rows.map(row => {
  const at = marks.findIndex((mark, index) => index >= pos && keys.every(key => row.memory[key] === mark[key]));
  assert(at >= pos, 'unmatched Host memory mark ' + row.phase);
  pos = at + 1;
  const current = marks[at].timeMs;
  const gcEvents = gc.filter(event => event.startTime >= end && event.startTime < current);
  end = current;
  return {phase: row.phase, timeMs: current, elapsedMs: row.elapsedMs, ...row.memory,
    requireCalls: row.requireCalls, moduleLoads: row.moduleLoads, nativeCalls: row.nativeCalls,
    propertyWrites: row.propertyWrites, snapshots: row.snapshots, gcCount: gcEvents.length,
    gcMs: gcEvents.reduce((sum, event) => sum + event.duration, 0)};
});
console.log(JSON.stringify({node, timeOrigin, maxRssKiB, phases}, null, 2));
