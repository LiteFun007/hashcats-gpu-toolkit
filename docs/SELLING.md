# Selling a cat — the verified procedure

Two exits exist: the **marketplace** (OpenSea) and the contract's **burn**. The
marketplace pays roughly 10–20× more, so it is the default; the burn is the
counterparty-free fallback.

Real sales from this tooling: a cat bought for 0.01008 ETH sold for **0.144 WETH**,
and the next one for **0.166 WETH** — both within a minute of deciding to sell.

## One-time setup per wallet

```bash
node cli.mjs sell approve --send            # Seaport 1.6 (0x0000…eB395)
node cli.mjs sell approve --conduit --send  # OpenSea's conduit (0x963F00d3ff…0C300)
```

> **Trap #1 — the conduit, not the controller.** The operator that actually moves
> your cat is `0x963F00d3ff000064fFCbA824b800c0000000C300` (you can verify it the way
> we did: read the collection's `ApprovalForAll` history and take the operator that
> every seller approves). Approving `0x0000007B0223…D60` — the ConduitController —
> looks right, does nothing, and fulfilment reverts with `NotOwnerNorApproved()`.

## Per cat

```bash
node cli.mjs sell status --token-id <id>     # owner, burn gates, approvals, balances
node cli.mjs sell offers                     # live offer ladder: price, expiry, offerer
node cli.mjs sell accept --token-id <id> --min-price 0.16 --send
node cli.mjs sell unwrap --send              # offers pay in WETH → unwrap to ETH
```

`sell accept` walks the ladder from the highest price down, re-reads each order's
fulfilment data in the same process, simulates every candidate, and only then sends
— so a stale or reverting transaction never reaches the chain.

> **Trap #2 — offer authorisation expires in minutes.** OpenSea's order carries a
> server-signed zone authorisation with a short deadline; the API tells you the
> deadline when it refuses (`Order not valid`). Never cache a fulfilment payload.

> **Trap #3 — OpenSea serialises keys alphabetically.** Parameters must be mapped by
> name, not position. `src/opensea.mjs` carries Seaport's real struct names for that
> reason; a positional encoder produces calldata that reverts.

## What the API looks like

| Step | Call |
|---|---|
| fees, currencies, supply | `GET /api/v2/collections/{slug}` (no key needed) |
| best offer for your cat | `GET /api/v2/offers/collection/{slug}/nfts/{id}/best` |
| ladder | `GET /api/v2/offers/collection/{slug}?limit=10` |
| fulfilment tx | `POST /api/v2/offers/fulfillment_data` |

```json
// POST body that works (criteria/collection offers need the consideration)
{
  "offer":  { "hash": "0x…", "chain": "robinhood", "protocol_address": "0x0000000000000068F116a894984e2DB1123eB395" },
  "fulfiller": { "address": "0xYourMiner" },
  "consideration": { "asset_contract_address": "0xCA75DF55Cc9C476DB27a7375D1fc8E794cf80721", "token_id": "754" }
}
```

The response is `{ function, input_data, to, value }`; `src/opensea.mjs` encodes it
with Seaport's own parameter names and sends it from your key. Fees taken by the
market: **1% OpenSea** (`0x0000a26b…a719`, required) plus a **5% ERC-2981 royalty**
to the protocol hook (`0xca7579…2aCC`). Offers are denominated in **WETH**; listings
are priced in ETH.

## The burn alternative

`node cli.mjs sell burn --token-id <id> --send` pays **1 000 $HASH** in the mint
epoch (halving each epoch you wait), which is worth about `mintPrice` — an order of
magnitude below the market. It requires 10 minutes since mint *and* one later cat,
and $HASH cannot be traded until the collection reaches cat 1016. Use it only if the
market is gone.

## Never

* never sell automatically — the miner mints, a human decides;
* never broadcast without simulating first (every command here does it for you);
* never leave more ETH in the mining wallet than the next few mints need.
