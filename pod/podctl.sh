#!/usr/bin/env bash
# Run a command on the miner pod: bash podctl.sh 'uname -a'
set -euo pipefail
cd "$(dirname "$0")"
IP=$(jq -r '.ip' ssh-info.json)
PORT=$(jq -r '.port' ssh-info.json)
exec ssh -i "$HOME/.ssh/id_ed25519" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=15 -p "$PORT" "root@$IP" "$@"
