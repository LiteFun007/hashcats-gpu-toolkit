# Credits & links

Everything in this repo was built on top of other people's infrastructure. If it
saves you time, use the links below — they are the ones that keep this work alive.

## RunPod — the GPU

Rent the 4090 here: **<https://runpod.io?ref=ji1x31lk>**

The referral link is also the easiest path to top up (cards). Costs to expect:
secure RTX 4090 **$0.74/h**, community **$0.34/h** when in stock; H100/H200 cost 3–7×
more and are *slower* at Keccak-256, so don't.

## DeepSeek — the agent's brain

**<https://platform.deepseek.com>**

The **flash** model is the right driver for the monitoring loop described in
`docs/AGENT.md`: cheap enough to wake up every few minutes, sharp enough to notice a
dead miner, a shrinking balance or a freshly minted cat, and to stop there and ask
before spending anything.

## @openapihubot — RPC and data in Telegram

**<https://t.me/openapihubot>**

Endpoints and on-chain data on demand. Handy when you want a second RPC for a
different chain, or a quick read without wiring anything up.

## OpenHub — the author's own RPC/data project

OpenHub is the same toolkit behind the bot: RPC access and data for the chains used
here. Point `RH_RPC` at your OpenHub endpoint if you'd rather not hammer a public
node:

```bash
export RH_RPC="https://your-openhub-endpoint"
node cli.mjs state
```

<!-- TODO: add the OpenHub repo/site link -->

## The site and the contracts

* Hashcats: <https://hashcats.fun> — the collection, the mining page and the docs
  whose mechanics were reproduced here.
* OpenSea: <https://opensea.io/collection/hash-cats> — where cats are actually sold.
* Robinhood Chain explorer: <https://robinhoodchain.blockscout.com> — the usual place
  to watch your mints and sales land.

## Honest note

This is an unofficial, reverse-engineered toolkit: nothing here is endorsed by
Hashcats, OpenSea, RunPod, DeepSeek or OpenHub — they simply made it possible. Mining
is a race with real costs, the market can collapse while you sleep, and the rules
(and contracts) can change without notice. Mine small, sell deliberately.
