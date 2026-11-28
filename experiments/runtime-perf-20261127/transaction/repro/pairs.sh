set -eu
for trial in 1 2 3; do
 if test "$((trial % 2))" = 1; then order='base direct'; else order='direct base'; fi
 for arm in $order; do
  taskset -c "${TX_CPU:-6}" node --max-old-space-size=768 build/perf-tx/worker.mjs "$PWD/build/perf-tx/production" "$arm" bare > build/perf-tx/host-$trial-$arm.log 2>&1
 done
done
taskset -c "${TX_CPU:-6}" node --max-old-space-size=768 build/perf-tx/worker.mjs "$PWD/build/perf-tx/production" base observer > build/perf-tx/host-observer-base.log 2>&1
