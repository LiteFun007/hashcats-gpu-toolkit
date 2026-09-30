#!/usr/bin/env bash
# Auto-scale the farm: snipe N RTX 4090 pods IN PARALLEL and deploy the patched
# miner to each (tags p1..pN). Failed create attempts are free; you pay only for
# pods that actually come up. Usage: bash pod/autoscale.sh <count> [rounds]
set -uo pipefail
cd "$(dirname "$0")"
N="${1:?usage: autoscale.sh <count> [rounds]}"; ROUNDS="${2:-150}"
echo "=== autoscale: sniping $N x RTX 4090 in parallel (tags p1..p$N) ==="
echo "    each retries up to $ROUNDS rounds; logs -> autoscale-p<i>.log"
pids=()
for i in $(seq 1 "$N"); do
  ( bash snipe4090.sh "p$i" "$ROUNDS" ) > "autoscale-p$i.log" 2>&1 &
  pids+=($!)
  echo "  launched snipe p$i (bg pid $!)"
  sleep 4   # stagger API calls
done
echo "=== waiting for all $N to finish deploying (this can take 5-15 min) ==="
for p in "${pids[@]}"; do wait "$p" || true; done
echo
echo "=== results ==="
for i in $(seq 1 "$N"); do echo "--- p$i ---"; tail -3 "autoscale-p$i.log"; done
echo
echo "=== full farm speed ==="
bash mon.sh
