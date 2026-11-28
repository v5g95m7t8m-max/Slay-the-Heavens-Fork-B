// Diagnostic only. Use --import with the existing runtime-baseline worker.
// Leave the worker, workload, GC policy and acceptance metrics unchanged.
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {performance, PerformanceObserver} from 'node:perf_hooks';

const destination = process.env.STH_MEMORY_TIMELINE;
if (!destination) throw new Error('Set STH_MEMORY_TIMELINE to a diagnostic JSON path');
const marks = [], gc = [];
const memoryUsage = process.memoryUsage;
function diagnosticMemoryUsage(...args) {
  const value = Reflect.apply(memoryUsage, this, args);
  marks.push({timeMs: performance.now(), ...value});
  return value;
}
// Preserve the distinct RSS-only API used by Node tooling.
diagnosticMemoryUsage.rss = memoryUsage.rss;
process.memoryUsage = diagnosticMemoryUsage;
const record = list => gc.push(...list.map(({startTime, duration, detail}) => ({startTime, duration, ...detail})));
const observer = new PerformanceObserver(list => record(list.getEntries()));
observer.observe({entryTypes: ['gc']});
let recorded = false;
process.on('beforeExit', () => {
  if (recorded) return;
  recorded = true;
  // The Lua worker is synchronous; give Node's GC notifications two turns
  // after the last phase. The reader excludes events after the final mark.
  setImmediate(() => setImmediate(() => {
    record(observer.takeRecords());
    observer.disconnect();
    process.memoryUsage = memoryUsage;
    mkdirSync(dirname(destination), {recursive: true});
    writeFileSync(destination, JSON.stringify({node: process.version, timeOrigin: performance.timeOrigin, marks, gc}) + '\n');
  }));
});
