#!/usr/bin/env bash
# Sniping loop: keep trying to create the hashcats miner pod across DC/GPU options.
# No --wait here (created-pod detection stays unambiguous). Stops at first success.
set -uo pipefail
cd "$(dirname "$0")"
export RUNPOD_API_KEY=$(cat runpod.key)
R=$HOME/.local/bin/runpodctl
PK=$(cut -d' ' -f1,2 < ~/.ssh/id_ed25519.pub)
IMG=runpod/pytorch:1.0.3-cu1281-torch291-ubuntu2404
ENV="{\"PUBLIC_KEY\":\"$PK\"}"
COMMON=( --image "$IMG" --env "$ENV" --ports '22/tcp' --container-disk-in-gb 20 )

attempt() {
  local label="$1"; shift
  printf '  try %-34s' "$label"
  "$R" pod create --name hashcats-miner -o json "$@" > pod.json 2> pod.err
  if [ -s pod.json ] && jq -e '.id' pod.json >/dev/null 2>&1; then
    echo "=> CREATED $(jq -r '.id' pod.json 2>/dev/null)"
    echo "$label" > pod.label
    return 0
  fi
  echo "-> $(cut -c1-120 pod.err 2>/dev/null)$(cut -c1-120 pod.json 2>/dev/null)"
  return 1
}

snipe() {
  attempt "4090-community-EU-CZ-1" --gpu-id "NVIDIA GeForce RTX 4090" --cloud-type COMMUNITY --data-center-ids EU-CZ-1 --public-ip "${COMMON[@]}" && return 0
  attempt "4090-community-EU-RO-1" --gpu-id "NVIDIA GeForce RTX 4090" --cloud-type COMMUNITY --data-center-ids EU-RO-1 --public-ip "${COMMON[@]}" && return 0
  attempt "4090-secure-any" --gpu-id "NVIDIA GeForce RTX 4090" --cloud-type SECURE "${COMMON[@]}" && return 0
  attempt "A6000-community-EU-SE-1" --gpu-id "NVIDIA RTX A6000" --cloud-type COMMUNITY --data-center-ids EU-SE-1 --public-ip "${COMMON[@]}" && return 0
  attempt "PRO4500-community-EU-RO-1" --gpu-id "NVIDIA RTX PRO 4500 Blackwell" --cloud-type COMMUNITY --data-center-ids EU-RO-1 --public-ip "${COMMON[@]}" && return 0
  attempt "A40-community-EU-SE-1" --gpu-id "NVIDIA A40" --cloud-type COMMUNITY --data-center-ids EU-SE-1 --public-ip "${COMMON[@]}" && return 0
  attempt "6000Ada-community-US-WA-1" --gpu-id "NVIDIA RTX 6000 Ada Generation" --cloud-type COMMUNITY --data-center-ids US-WA-1 --public-ip "${COMMON[@]}" && return 0
  attempt "L4-community-EUR-IS-1" --gpu-id "NVIDIA L4" --cloud-type COMMUNITY --data-center-ids EUR-IS-1 --public-ip "${COMMON[@]}" && return 0
  return 1
}

for i in 1 2 3 4 5 6; do
  echo "--- round $i ---"
  if snipe; then
    echo "FINAL_OK $(jq -r '.id' pod.json) [$(cat pod.label)]"
    exit 0
  fi
  sleep 10
done
echo "ALL_ATTEMPTS_FAILED"
exit 1
