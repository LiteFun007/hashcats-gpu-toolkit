#!/usr/bin/env bash
# Deploy miner bundle to the created pod and start setup (background).
# Usage: bash deploy-pod.sh
set -uo pipefail
cd "$(dirname "$0")"
export RUNPOD_API_KEY=$(cat runpod.key)
R=$HOME/.local/bin/runpodctl
PID=$(jq -r '.id' pod.json)
echo "pod: $PID"

# 1) wait for ssh info
INFO=""; IP=""
for i in $(seq 1 40); do
  INFO=$("$R" ssh info "$PID" -o json 2>/dev/null || true)
  IP=$(printf '%s' "$INFO" | jq -r '.ip // empty' 2>/dev/null)
  [ -n "$IP" ] && break
  sleep 15
done
[ -n "$IP" ] || { echo "ssh info never became ready"; exit 1; }
printf '%s' "$INFO" > ssh-info.json
PORT=$(printf '%s' "$INFO" | jq -r '.port')
echo "ip=$IP port=$PORT"
SSH=(ssh -i "$HOME/.ssh/id_ed25519" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=15 -p "$PORT" "root@$IP")

# 2) wait for sshd
OUT=""
for i in $(seq 1 30); do
  OUT=$("${SSH[@]}" 'echo ssh-ok' 2>/dev/null)
  [ "$OUT" = "ssh-ok" ] && break
  sleep 10
done
[ "$OUT" = "ssh-ok" ] || { echo "sshd not answering; re-read ssh info (port may change)"; exit 1; }
echo "ssh ok"

# 3) push bundle
tar czf bundle.tgz pod-setup.sh shim.js signer.mjs runner.mjs evm.key
"${SSH[@]}" 'mkdir -p /root/miner'
cat bundle.tgz | "${SSH[@]}" 'tar xzf - -C /root/miner && echo bundle-ok'

# 4) start setup in background
"${SSH[@]}" 'cd /root/miner && nohup bash pod-setup.sh > setup.log 2>&1 & echo setup-started'
echo "SETUP_STARTED"
