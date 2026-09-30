# RunPod: renting the right GPU without burning money

## Account and API key

1. Sign up: <https://runpod.io?ref=ji1x31lk>
2. **Billing → Add funds** (cards; crypto where supported).
3. **Settings → API keys → Create** — copy the `rpa_…` value once.

```bash
export RUNPOD_API_KEY=rpa_...
export PATH="$HOME/.local/bin:$PATH"
runpodctl version            # install: see runpodctl docs, or use the official CLI
runpodctl user               # balance + current spend per hour — check this often
```

`runpodctl` is the only interface the tooling needs; the console is convenient for
watching a pod's logs.

## Picking a GPU

| GPU | $/h (community / secure) | Keccak | Verdict |
|---|---|---|---|
| **RTX 4090** | **0.34 / 0.74** | 4.76–5.06 GH/s | ✅ the only sensible choice |
| RTX 6000 Ada / L40S | 0.74 / 0.84 · 0.79 / 1.09 | ~Ada-class | acceptable, pricier |
| RTX A6000 / A40 / L4 | 0.33 / 0.53 · — / 0.49 | Ampere/Ada-lite, 1.5–2.4 GH/s | worse per dollar |
| A100 / H100 / H200 | 1.19–4.59 | 2.0–2.9 GH/s | ❌ more money, *less* hashrate |

Keccak-256 is int32-ALU bound: data-centre cards buy you HBM and tensor cores you
will never touch.

## Creating a pod (the cascade in `pod/create-pod2.sh`)

Community 4090s sell out in seconds and stock is per data centre, so the script
tries a list of data centres and both clouds, in order: cheap first, and it stops at
the first success. Typical outcomes:

* `There are no longer any instances available with the requested specification` —
  keep looping, or accept a secure pod for ~2× the price.
* A pod stuck in `initializing` with no GPU is a scheduling failure: remove it and
  create another (the API reports it plainly, no need to guess).

```bash
runpodctl pod create --help          # the exact flags for your CLI version
runpodctl pod list                   # id, name, status, $/h
runpodctl pod get <id>               # ports, image, uptime
runpodctl pod stop <id> | runpodctl pod remove <id>
```

**No network volume** keeps it fast to create and cheap to idle, but a stopped pod
loses its container: budget ~6–8 minutes to redeploy (`deploy-pod.sh` is idempotent).

## Cost control

```bash
runpodctl user | jq -r '"balance=\(.clientBalance) spend=\(.currentSpendPerHr)/h"'
# hours left = balance / spend
```

* One 4090 ($0.74/h) for a day is ~$18. Ten of them is ~$178 — the floor is not
  obliged to hold while you sleep.
* The API happily racks up pods: `pod list` before and after every scaling step, and
  check the balance again after.
* If a pod's miner is dead, fix it or remove it — a misconfigured pod still bills.

## Deploying the miner

```bash
bash pod/deploy-pod.sh     # bundles the miner, copies it in, runs pod-setup.sh
bash pod/start-miner.sh    # starts signer.mjs + runner.mjs, writes pid files
bash pod/podctl.sh 'tail -20 /root/miner/runner.log'
```

`pod-setup.sh` installs Chrome + the Vulkan ICD fallback (so WebGPU works on a
headless box) and the Node dependencies. `runner.mjs` drives Chrome over CDP,
bypasses the page CSP (which otherwise blocks the local signing shim) and reconnects
on its own. `signer.mjs` is the EIP-1193 shim the page talks to; it holds the key in
memory only.

Expect `[gpu] webgpu ok`, `wallet connected: true`, then a stream of
`{"miner":"SEARCHING","speed":"…GH/S","wait":"…"}` lines. HTTP 429s in the log are
page assets being rate-limited — they do not stop the search.
