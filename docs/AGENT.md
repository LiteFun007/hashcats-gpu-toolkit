# Running it with an agent (DeepSeek flash + your own data bot)

The boring part of mining is not the hashing — it is watching pods, restarting a
dead miner at 3 a.m., and noticing that a cat landed. That is exactly the work to
delegate to a cheap, fast model while a human keeps the two decisions that matter:
how much to spend, and when to sell.

## Stack

* **Agent model:** DeepSeek **flash** — fast and cheap enough to run every few
  minutes (<https://platform.deepseek.com>). Escalate to a larger model only for the
  rare judgement calls (market read, incident triage).
* **Chain data & RPC:** **OpenHub** — the author's own project, also available as the
  Telegram bot **@openapihubot** for endpoints and data. Point the agent at that RPC
  instead of hard-coding a public one.
* **Compute:** **RunPod** <https://runpod.io?ref=ji1x31lk>.
* **Tooling:** this repo. The agent's whole vocabulary is `cli.mjs`, `podctl.sh` and
  `runpodctl`.

## The two loops

### 1. Monitoring — read-only, every 10 minutes

Paste this as the agent's scheduled prompt (it is the exact prompt used to build this
repo). Note what it forbids: no creates, no stops, no restarts, no writes — a
monitor that "fixes" things is how you wake up to eleven pods.

```
READ-ONLY MONITORING. Do not create, stop, restart or write anything — report only.
1) RunPod: export PATH=$HOME/.local/bin:$PATH;
   export RUNPOD_API_KEY=$(cat runpod.key);
   runpodctl pod list — list pods (id, name, status, $/h), total $/h, balance, and
   hours left = balance / total spend.
2) Chain: node cli.mjs state (totalMinted, epoch, targetBits, mintPriceEth) and
   node tests/probe-pace.mjs (pace in seconds, implied network hashrate).
3) Pods, read-only: podctl.sh 'pgrep -af "signer.mjs|runner.mjs"; tail -5 runner.log'
   — note HTTP 429s, restarts, dead processes.
4) Report 3-6 lines: pods + cost + hours left; mint (number, delta, pace, bits, price);
   is the miner alive; anomalies.
If something died or the balance is under 2 hours, report it and propose an action —
do not perform it.
```

### 2. Selling — consent-gated, never automatic

```
When the miner wallet owns a cat, report: token id, current best offer, live ladder,
floor, and what the sale would net after fees. Propose the exact commands. Then WAIT.
Only run `sell accept … --send` and `sell unwrap --send` after I explicitly say sell.
Never run them on your own initiative, and never with a --min-price above the top
live offer (that silently skips everything).
```

That last clause is not hypothetical: a `--min-price 0.18` guard once refused a book
whose top valid offer had already dropped to 0.166, and the sale sat there "failing".

## What the agent may do without asking

* read anything: `runpodctl pod list|get|user`, `cli.mjs state|sell status|sell offers|bench`
* restart a **dead** miner on an existing pod (`start-miner.sh`)
* redeploy the bundle to an existing pod (`deploy-pod.sh`)
* report, summarise, propose

## What always needs a human

* creating or removing pods (money), topping up the balance
* any `--send` that moves an asset: mint, sale, transfer, burn
* raising the spend rate, or leaving pods running unattended

## Hygiene

* Keep secrets in files, never in prompts: `runpod.key`, `opensea.key`, `evm.key`
  (all `chmod 600`), and never echo them into logs. `tools/secret-relay.mjs` exists to
  hand a key to a wallet UI over loopback so it never appears in a shell command.
* The pod is a hot environment: the mining wallet holds only what the next few mints
  cost. Withdraw the proceeds (`cli.mjs send --to … --amount … --send`) and keep a
  small reserve.
* Rotate the RunPod key when the agent's job is done, and revoke the OpenSea key if
  you stop selling.
