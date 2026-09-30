# Hashcats Quickstart — mine on a rented GPU, sell on OpenSea

From an empty machine to a minted cat and a completed OpenSea sale, without a
browser in the loop if you don't want one. Everything here was verified against the
live chain and the live marketplace — the hard-won details (a conduit address, an
expiring order authorisation, an alphabetical JSON quirk) are written down so you
don't spend a day rediscovering them.

> **Read this first.** Hashcats mining is a proof-of-work race for a scarce NFT on
> Robinhood Chain. This repo is an unofficial toolkit: using it is a ToS risk you
> own, the contracts can change, and the market can go to zero. Mine with a **hot
> wallet holding only what you can lose**, never your main key.

## What it costs and what it pays (measured, not promised)

| Hardware | Keccak-256 rate | Source |
|---|---|---|
| RTX 4090, browser WebGPU kernel | **4.76 GH/s** | observed on a rented RunPod 4090 |
| RTX 4090, reference hashcat bench | 5.06 GH/s | hashcat mode 17800 |
| H100 PCIe, reference bench | 2.79 GH/s | same — a 4090 is *faster* per hash |
| 4 CPU threads, this repo's kernel | 19.1 MH/s | `node cli.mjs bench` |

Rent is the only real cost: a **secure RTX 4090 is $0.74/h** on RunPod, a community
one **$0.34/h** when in stock. Nothing else comes close for Keccak (it is an
int32-ALU workload: H100/H200 are 4–7× the price for *less* hashrate).

At the 47–48 bit difficulty seen in September 2026, one 4090 expects a cat every
**8–16 hours**; the network's own pace is ~13 s per cat (≈21 TH/s aggregate, so you
are a rounding error and do not move the difficulty). A cat sells for roughly
**0.17–0.19 ETH**, while the contract charges **0.01008 ETH** to mint it — a large
margin *while the floor holds*. The mint price rises every epoch and the collection
is finite (16 376 cats), so the edge decays; check the numbers before scaling.

## Fast path

```bash
# 0. Node 20+, then the one dependency the client needs
npm install                   # viem; puppeteer-core matters only for the browser path

# 1. Rent the GPU (referral link keeps the project alive — see CREDITS.md)
#    RunPod → Billing → API keys → create one; then:
export RUNPOD_API_KEY=rpa_...
export PATH="$HOME/.local/bin:$PATH"          # runpodctl lives here

# 2. Create a 4090 pod, deploy the browser miner, start it
bash pod/create-pod2.sh        # tries community 4090s first, falls back to secure
bash pod/deploy-pod.sh         # uploads the miner bundle and runs pod-setup.sh
bash pod/start-miner.sh        # starts the local signer + the browser runner

# 3. Watch it work
bash pod/podctl.sh 'tail -5 /root/miner/runner.log'
#   [gpu] webgpu ok: lovelace        ← the GPU kernel is live
#   wallet connected: true
#   {"miner":"SEARCHING","speed":"4.76GH/S","wait":"8h 05m","target":"47 LEADING ZERO BITS"}

# 4. With no browser at all: the headless client (CPU mining, mint, sell)
cd . && node cli.mjs state
node cli.mjs bench --seconds 10 --threads 8
node cli.mjs mine --threads 8
```

Keys: the miner wallet's private key is passed to the pod as `evm.key` (0600) and is
the only secret that goes there. Its address is what mints and what sells — so treat
the pod as a hot environment and keep the balance small.

## Selling (the part everyone gets wrong)

```bash
export OPENSEA_API_KEY=...            # opensea.io → Settings → Developer
node cli.mjs sell status --token-id <id>
node cli.mjs sell offers                        # live ladder: price, expiry, offerer
node cli.mjs sell accept --token-id <id> --min-price 0.16 --send
node cli.mjs sell unwrap --send                 # offers pay in WETH → unwrap to ETH
```

Three traps, in order of how much time they cost:

1. **Approve the conduit, not the ConduitController.** The operator that moves your
   cat is `0x963F00d3ff000064fFCbA824b800c0000000C300`. Approving the controller
   (`0x0000007B0223…D60`) looks right and reverts with `NotOwnerNorApproved()`.
2. **Offers expire within minutes.** Always read the order *and* its fulfilment data
   in the same process, immediately before sending — a cached payload is dead.
3. **OpenSea returns object keys alphabetically.** Map parameters by name, never by
   position (this repo's encoder carries Seaport's real struct names).

Full detail, including fees (1% OpenSea + 5% royalty) and the burn alternative:
[`docs/SELLING.md`](docs/SELLING.md).

## Guardrails built into the tooling

* **Nothing broadcasts without `--send`** — every write path simulates first.
* **Selling is manual by design.** The miner mints; a human (or an agent you
  supervise) decides to sell. There is no auto-sell, on purpose.
* **No secret ever goes into a shell command or a log** — `tools/secret-relay.mjs`
  exists to feed a key into a wallet UI over loopback instead.

## Repo map

```
cli.mjs              one command surface: state, oracle, bench, mine, run, send, sell …
src/chain.mjs        chain binding + the proven work-hash layout
src/miner.mjs        worker pool over the site's own kernel, solution verification
src/opensea.mjs      orderbook glue: best offer, fulfilment tx, calldata encoder
src/seaport.mjs      Seaport 1.6 facts verified on chain (domain, counters, ABI)
src/sell.mjs         exits: status, approve, transfer, claim, burn, unwrap
vendor/              the site's own miner modules, verbatim (CPU + WGSL GPU)
pod/                 RunPod deployment: create, setup, deploy, start, control
tests/               read-only probes, one per claim in these docs
docs/                RUNPOD.md · MINING.md · SELLING.md · AGENT.md
```

## Links that made this possible

* **RunPod** — the GPU marketplace used here: <https://runpod.io?ref=ji1x31lk>
  (referral link; also the cheapest way to top up with cards).
* **DeepSeek API** — the *flash* model drives the agent that watches pods, keeps the
  miner alive and reports: <https://platform.deepseek.com> → see `docs/AGENT.md`.
* **@openapihubot** — Telegram bot for RPC endpoints and on-chain data.
* **OpenHub** — the author's own RPC/data project; the same toolkit as the bot.

## I want to run this hands-off

See [`docs/AGENT.md`](docs/AGENT.md) for a copy-paste agent playbook: a read-only
monitoring loop, a consent-gated sell command, and the exact prompts.
