#!/usr/bin/env bash
# hashcats pod miner — one-time setup inside a RunPod GPU pod (run as root).
# Usage: bash pod-setup.sh
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq --no-install-recommends \
  libvulkan1 wget curl ca-certificates gnupg unzip nodejs npm jq

# Google Chrome (stable)
if ! command -v google-chrome >/dev/null 2>&1; then
  wget -qO /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
  apt-get install -y -qq /tmp/chrome.deb || apt-get -f install -y -qq
fi

# diagnostics: GPU + Vulkan
(apt-get install -y -qq vulkan-tools >/dev/null 2>&1) || true
echo "===== nvidia-smi ====="
nvidia-smi || true
echo "===== vulkaninfo (summary) ====="
vulkaninfo --summary 2>/dev/null | sed -n '1,40p' || echo "vulkaninfo failed"
echo "===== vulkan ICDs ====="
ls -la /usr/share/vulkan/icd.d/ 2>/dev/null || echo "no /usr/share/vulkan/icd.d"
# auto-fix: if the vulkan loader sees no NVIDIA GPU, write the ICD manifest
if [ -z "$(vulkaninfo --summary 2>/dev/null | sed -n '/[Nn]VIDIA/p')" ]; then
  mkdir -p /usr/share/vulkan/icd.d
  printf '{"file_format_version":"1.0.0","ICD":{"library_path":"libGLX_nvidia.so.0","api_version":"1.1.0"}}' > /usr/share/vulkan/icd.d/nvidia_icd.json
  echo "wrote fallback nvidia_icd.json"
  vulkaninfo --summary 2>/dev/null | sed -n '1,25p' || true
fi

# node deps for signer + runner
cd "$(dirname "$0")"
npm init -y >/dev/null 2>&1 || true
npm i --no-fund --no-audit viem puppeteer-core

echo
echo "setup done."
echo "next steps:"
echo "  1) node gen-burner.mjs            # create ./burner.key (if not exists)"
echo "  2) node signer.mjs &              # signer daemon on 127.0.0.1:8787"
echo "  3) node runner.mjs                # headless Chrome + miner"
