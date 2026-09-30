// DRY RUN of the whole sale path: best offer -> OpenSea fulfillment -> calldata.
// Reads only. Nothing is signed or broadcast here — `sell accept` does that, and
// only with an explicit --send.
//
//   OPENSEA_API_KEY=... node tests/probe-sell-path.mjs [tokenId]
import { fetchBestOffer, fetchOfferFulfillment, encodeFulfillment } from '../src/opensea.mjs';

const tokenId = process.argv[2] || '687';
const apiKey = process.env.OPENSEA_API_KEY;
const fulfiller = process.env.FULFILLER;
if (!fulfiller) { console.error('set FULFILLER or MINER_ADDR (your wallet)'); process.exit(1); }

if (!apiKey) {
  console.log(JSON.stringify({ skipped: 'set OPENSEA_API_KEY to exercise the sale path' }));
  process.exit(0);
}

const best = await fetchBestOffer({ tokenId, apiKey });

let fulfillment;
try {
  fulfillment = await fetchOfferFulfillment({ tokenId, apiKey, address: fulfiller, offerHash: best.orderHash });
} catch (err) {
  // Expected while we hold no cat: OpenSea refuses to build a fulfillment for an
  // item the fulfiller does not own.
  console.log(JSON.stringify({ tokenId, best, fulfillment: 'refused', reason: err.message.slice(0, 140) }, null, 1));
  process.exit(0);
}

const tx = fulfillment.transaction ?? fulfillment;
const encoded = encodeFulfillment(tx);

console.log(JSON.stringify({
  tokenId,
  best,
  to: encoded.to,
  value: encoded.value.toString(),
  function: encoded.signature,
  selector: encoded.data.slice(0, 10),
  calldataBytes: (encoded.data.length - 2) / 2,
  note: 'dry run only — no signature, no broadcast',
}, null, 1));
