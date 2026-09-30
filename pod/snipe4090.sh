#!/usr/bin/env bash
# Snipe a real RTX 4090 (community first, then secure), retrying until caught,
# then deploy the patched miner. Failed create attempts cost nothing.
# Usage: bash pod/snipe4090.sh <tag> [rounds]   e.g. bash pod/snipe4090.sh c 60
set -uo pipefail
cd "$(dirname "$0")"
export RUNPOD_API_KEY=$(cat runpod.key)
R=$HOME/.local/bin/runpodctl
TAG="${1:?usage: snipe4090.sh <tag> [rounds]}"; ROUNDS="${2:-60}"
MINER=0x1e0b1A112CBc934897e6433149e6a5f88B65F018
PK=$(cut -d' ' -f1,2 < ~/.ssh/id_ed25519.pub)
IMG=runpod/pytorch:1.0.3-cu1281-torch291-ubuntu2404
ENV="{\"PUBLIC_KEY\":\"$PK\"}"
PODJSON="pod-$TAG.json"; SSHJSON="ssh-info-$TAG.json"; ERR="pod-$TAG.err"

mk(){ "$R" pod create --name "hashcats-$TAG" -o json --gpu-id "NVIDIA GeForce RTX 4090" --cloud-type "$1" $2 \
   --image "$IMG" --env "$ENV" --ports '22/tcp' --container-disk-in-gb 40 > "$PODJSON" 2>"$ERR"; \
   jq -e .id "$PODJSON" >/dev/null 2>&1; }

echo "[$TAG] sniping RTX 4090 (up to $ROUNDS rounds)..."
CAUGHT=0
for i in $(seq 1 "$ROUNDS"); do
  if mk SECURE ""; then CAUGHT=1; echo "[$TAG] caught secure 4090 round $i"; break; fi
  printf '.' ; sleep 8
done
echo
[ "$CAUGHT" = 1 ] || { echo "[$TAG] no 4090 in $ROUNDS rounds — try again later or use add-miner.sh (A40)"; exit 1; }
PID=$(jq -r .id "$PODJSON"); echo "[$TAG] pod=$PID"

INFO=""; IP=""
echo "[$TAG] waiting for ssh info..."
for i in $(seq 1 40); do INFO=$("$R" ssh info "$PID" -o json 2>/dev/null || true); IP=$(printf '%s' "$INFO" | jq -r '.ip // empty' 2>/dev/null); [ -n "$IP" ] && break; sleep 15; done
[ -n "$IP" ] || { echo "[$TAG] no ssh info"; exit 1; }
printf '%s' "$INFO" > "$SSHJSON"; PORT=$(printf '%s' "$INFO" | jq -r .port)
SSH=(ssh -i "$HOME/.ssh/id_ed25519" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=15 -p "$PORT" "root@$IP")
echo "[$TAG] ip=$IP port=$PORT ; waiting sshd..."
for i in $(seq 1 30); do [ "$("${SSH[@]}" 'echo ok' 2>/dev/null)" = ok ] && break; sleep 10; done

echo "[$TAG] pushing bundle + setup..."
tar czf "bundle-$TAG.tgz" pod-setup.sh shim.js signer.mjs runner.mjs evm.key
"${SSH[@]}" 'mkdir -p /root/miner'
cat "bundle-$TAG.tgz" | "${SSH[@]}" 'tar xzf - -C /root/miner 2>/dev/null && echo bundle-ok'
"${SSH[@]}" 'cd /root/miner && nohup bash pod-setup.sh > setup.log 2>&1 & echo setup-started'
echo "[$TAG] waiting for setup (~3-5 min)..."
for i in $(seq 1 40); do "${SSH[@]}" 'grep -q "setup done" /root/miner/setup.log' 2>/dev/null && { echo "[$TAG] setup done"; break; }; sleep 15; done

echo "[$TAG] starting signer + runner..."
"${SSH[@]}" "cd /root/miner
if [ -f signer.pid ] && kill -0 \$(cat signer.pid) 2>/dev/null; then echo 'signer ok'; else nohup node signer.mjs > signer.log 2>&1 </dev/null & echo \$! > signer.pid; echo signer-started; fi
sleep 2
MINER_ADDR=$MINER nohup node runner.mjs > runner.log 2>&1 </dev/null & echo \$! > runner.pid; echo runner-started
sleep 45; echo '--- runner.log tail ---'; tail -6 runner.log"
echo "[$TAG] DONE (4090). Monitor: bash pod/mon.sh"
