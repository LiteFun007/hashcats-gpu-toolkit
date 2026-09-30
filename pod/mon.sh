#!/usr/bin/env bash
# Monitor miner speed across all pods. Usage: bash pod/mon.sh [tag]
set -uo pipefail
cd "$(dirname "$0")"
TMP=$(mktemp)
one(){
  local f="$1" tag="$2" ip port line sp st
  ip=$(jq -r .ip "$f" 2>/dev/null); port=$(jq -r .port "$f" 2>/dev/null)
  [ -n "$ip" ] || return
  line=$(ssh -i "$HOME/.ssh/id_ed25519" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=12 -p "$port" "root@$ip" 'grep "\"miner\":" /root/miner/runner.log 2>/dev/null | tail -1' 2>/dev/null)
  sp=$(printf '%s' "$line" | sed -n 's/.*"speed":"\([^"]*\)".*/\1/p')
  st=$(printf '%s' "$line" | sed -n 's/.*"miner":"\([^"]*\)".*/\1/p')
  printf '  %-6s %-10s %s\n' "$tag" "${st:-DOWN}" "${sp:-—}"
  case "$sp" in *GH/S) echo "${sp%GH/S}" >> "$TMP";; *MH/S) awk "BEGIN{print ${sp%MH/S}/1000}" >> "$TMP";; esac
}
echo "TAG    STATUS     SPEED"
if [ -n "${1:-}" ]; then
  [ -f "ssh-info-$1.json" ] && one "ssh-info-$1.json" "$1" || one "ssh-info.json" "$1"
else
  [ -f ssh-info.json ] && one ssh-info.json "A40"
  for f in ssh-info-*.json; do [ -e "$f" ] || continue; t=${f#ssh-info-}; t=${t%.json}; one "$f" "$t"; done
fi
total=$(awk '{s+=$1} END{printf "%.2f", s}' "$TMP" 2>/dev/null); rm -f "$TMP"
echo "  ------------------------------"
echo "  TOTAL: ${total:-0} GH/s"
