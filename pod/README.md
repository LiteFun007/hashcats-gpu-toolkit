# Deploying the miner on RunPod

Four scripts, one direction: create → deploy → start → control.

| Script | What it does | Writes |
|---|---|---|
| `create-pod2.sh` | rents a GPU — walks a list of data centres and both clouds, cheap first, stops at the first success | `pod.json` (id, ports), `pod.err` (last failure) |
| `deploy-pod.sh` | reads `pod.json`, waits for the SSH endpoint, uploads the miner bundle, runs `pod-setup.sh` inside | `ssh-info.json` (ip + port) |
| `start-miner.sh` | starts `signer.mjs` (the EIP-1193 shim holding the key) and `runner.mjs` (Chrome + WebGPU), pid files included | `runner.log`, `signer.log` |
| `podctl.sh` | runs any command on the pod | — |

## What must exist first

* `runpod.key` — an `rpa_…` API key (0600), exported as `RUNPOD_API_KEY` by the scripts
* `evm.key` — the miner's private key (0600). Its address is what mints and what sells
* `~/.ssh/id_ed25519(.pub)` — registered in your RunPod account
* `runpodctl` on PATH, plus `node`, `jq`, `ssh`, `scp`

## Typical session

```bash
export RUNPOD_API_KEY=$(cat runpod.key)
bash create-pod2.sh     # prints: FINAL_OK <pod-id> [<label>]
bash deploy-pod.sh      # ~6–8 minutes: Chrome, the Vulkan ICD fallback, node deps
bash start-miner.sh
bash podctl.sh 'tail -5 /root/miner/runner.log'
```

Expect `[gpu] webgpu ok: lovelace`, `wallet connected: true`, then a stream of
`{"miner":"SEARCHING","speed":"4.76GH/S","wait":"…"}`. HTTP 429s in the log are page
assets being rate-limited — the search keeps going.

## Gotchas

* **Stock.** Community 4090s sell out instantly and availability is per data centre;
  `create-pod2.sh` loops until something sticks. If everything fails, a secure pod
  costs ~2× and is usually available.
* **No network volume** → stopping a pod destroys the container. Budget 6–8 minutes to
  redeploy; `deploy-pod.sh` is idempotent.
* **One runner, not two.** `start-miner.sh` skips anything whose pid file is alive. If
  you ever see two runners, kill both and start again so they don't double-report.
* The key lives in the pod's memory only (inside `signer.mjs`), and every local secret
  stays in a 0600 file — never in a shell argument, never in a log.
