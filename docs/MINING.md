# How the mining actually works

## The protocol, proven rather than guessed

```
preimage = address(20) ‖ uint256BE(nonce) ‖ uint256BE(prevWork) ‖ bytes32(anchor)   // 116 bytes
digest   = keccak256(preimage)      // standard Keccak-256, one 136-byte block
accept   ⇔ uint256BE(digest) < targetFor(miner)
```

`prevWork` is the work of the previous cat, so every mint re-seeds the search;
`anchor` is a recent block hash; the nonce is yours to choose. The contract
recomputes all of this in `mine(uint256 nonce, uint256 anchorBlock)` — the address
inside the preimage is `msg.sender`, which is why a solution is not transferable.

Verify it yourself (this is the claim the whole repo rests on):

```bash
node tests/probe-hash.mjs      # compares local keccak against the on-chain workHash() oracle
node tests/probe2-nonce.mjs    # shows the nonce is a full uint256, not a 64-bit slot
```

## Difficulty: epoch floor, streak, retarget

* `epochFloor(epoch)` sets a floor (26 bits + epoch);
* a **streak** doubles the work: a recent mint adds a bit (`currentBurst()`), and
  the counter cools one step per interval, per network *and* per address;
* a retarget every 8 mints steers the real pace towards ~10 s per cat, up to 4×
  harder and at most 2× easier per window.

So the practical rule of thumb: **expected hashes per cat ≈ 2^(current bits)**, and
if you mint repeatedly from one address your own streak makes the next cat harder —
using several addresses spreads that out.

```bash
node tests/probe-pace.mjs      # real pace in seconds, bits, implied network hashrate
node cli.mjs state             # targetFor(your address), price, epoch, prevWork, anchor
```

## The kernel

We did not reimplement Keccak. `vendor/cpu.worker.js` is the site's own miner module,
executed verbatim under `node:worker_threads` (see `src/worker-host.mjs`, which only
supplies the `self` global it expects). It carries a WASM pair-lane kernel and:

```bash
node cli.mjs bench --seconds 10 --threads 4     # ~19 MH/s on 4 threads here
node cli.mjs mine --bits 24 --seconds 60        # engine self-test on an easy target
```

The GPU path is WebGPU, which Node does not expose — that is why the quickest way to
use a 4090 is the browser runner in `pod/` (4.76 GH/s measured), and why a native
CUDA/OpenCL port is the obvious next step for anyone who wants more.

## Expectations

| Bits | Expected hashes | 4090 @4.76 GH/s | 4 CPU threads @19 MH/s |
|---|---|---|---|
| 41 | 2.2T | ~7 min | ~32 h |
| 44 | 17.6T | ~1 h | ~10 days |
| 47 | 141T | ~8.2 h | ~86 days |
| 48 | 281T | ~16.4 h | — |

(Multiply by your share if you run several GPUs; the network retargets, so more
miners means more bits for everyone.)

## Anchors, and the two clocks you must respect

* The **anchor** must be recent when the mint lands: roughly 250 blocks. Mining
  continues across anchor changes — you just search with the current one.
* The **zone authorisation** in a marketplace order expires in minutes (see
  `SELLING.md`); that is a marketplace clock, not a mining one.
* A minted cat cannot be **burned** for 10 minutes, and only if a later cat exists.
