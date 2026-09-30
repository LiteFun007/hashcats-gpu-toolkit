#!/usr/bin/env bash
# Start signer + runner on the pod (run after pod-setup.sh finishes).
# Usage: bash start-miner.sh
set -uo pipefail
cd "$(dirname "$0")"
echo "== setup.log tail =="
bash podctl.sh 'tail -4 /root/miner/setup.log' || true
echo "== GPU / Vulkan =="
bash podctl.sh 'nvidia-smi -L 2>/dev/null | cut -c1-80; vulkaninfo --summary 2>/dev/null | sed -n "1,14p"' || true
echo "== starting signer + runner =="
bash podctl.sh 'cd /root/miner
start() { n="$1"; c="$2"; if [ -f "$n.pid" ] && kill -0 "$(cat $n.pid)" 2>/dev/null; then echo "$n already running"; return 0; fi; nohup $c > "$n.log" 2>&1 < /dev/null & echo $! > "$n.pid"; echo "$n started pid=$!"; }
start signer "node signer.mjs"; sleep 2; start runner "node runner.mjs"; sleep 25; echo --- signer.log ---; tail -4 signer.log; echo --- runner.log ---; tail -18 runner.log'
echo "== balance of miner wallet on pod =="
bash podctl.sh 'curl -s http://127.0.0.1:8787 | cut -c1-300' || true
