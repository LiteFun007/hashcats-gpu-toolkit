// Encoder round-trip: an OpenSea-shaped fulfillment payload -> calldata -> decoded
// back -> compared value by value. Also prints the public collection metadata.
import { decodeAbiParameters } from 'viem';
import { encodeFulfillment, selfCheckEncoding, collectionInfo, splitSignature } from '../src/opensea.mjs';

const zero32 = `0x${'00'.repeat(32)}`;
const SIG = 'fulfillBasicOrder_efficient_6GL6yc((address,uint256,uint256,address,address,address,uint256,uint256,uint8,uint256,uint256,bytes32,uint256,bytes32,bytes32,(uint256,address)[],bytes))';
const params = {
  considerationToken: '0x0000000000000000000000000000000000000000',
  considerationIdentifier: '0',
  considerationAmount: '10000000000000000',
  offerer: '0x6465879ab009d21859439ed7d2976678c2a4efe7',
  zone: '0x0000000000000000000000000000000000000000',
  offerToken: '0x0bd7d308f8e1639fab988df18a8011f41eacad73',
  offerIdentifier: '1',
  offerAmount: '120000000000000000',
  basicOrderType: '1',
  startTime: '1757620000',
  endTime: '1758200000',
  zoneHash: zero32,
  salt: `0x${'11'.repeat(32)}`,
  offererConduitKey: zero32,
  fulfillerConduitKey: zero32,
  additionalRecipients: [{ amount: '1000000000000000', recipient: '0x0000a26b00c1f0df003000390027140000faa719' }],
  signature: `0x${'22'.repeat(65)}`,
};
const synthetic = { function: SIG, chain: 'robinhood', to: '0x0000000000000068F116a894984e2DB1123eB395', value: '0', input_data: { parameters: params } };

/** Compare values semantically: hex and decimal forms of the same number are equal. */
const norm = (v) => {
  if (typeof v === 'bigint') return v.toString();
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') {
    if (/^0x[0-9a-fA-F]{40}$/.test(v)) return v.toLowerCase();   // address
    if (/^0x[0-9a-fA-F]+$/.test(v)) return BigInt(v).toString(); // bytes / uint -> decimal
    if (/^\d+$/.test(v)) return BigInt(v).toString();
    return v;
  }
  if (Array.isArray(v)) return v.map(norm);
  // objects and tuples both normalise positionally: OpenSea's JSON keys are not ordered
  if (v && typeof v === 'object') return Object.values(v).map(norm);
  return v;
};

const info = await collectionInfo();
const encoded = encodeFulfillment(synthetic);
const decoded = decodeAbiParameters(splitSignature(SIG).inputs, `0x${encoded.data.slice(10)}`);
const got = Object.values(decoded[0]);
const want = Object.values(params);
const labels = Object.keys(params);
const diffs = got
  .map((v, i) => ({ field: labels[i], got: JSON.stringify(norm(v)), want: JSON.stringify(norm(want[i])) }))
  .filter((r) => r.got !== r.want);

console.log(JSON.stringify({
  collection: {
    slug: info.slug, chain: info.chain, fees: info.fees,
    listingCurrency: info.listingCurrency, offerCurrency: info.offerCurrency,
    collectionOffersEnabled: info.collectionOffersEnabled, supply: info.totalSupply,
  },
  encoded: {
    to: encoded.to, value: encoded.value.toString(), function: encoded.signature,
    selector: encoded.data.slice(0, 10), bytes: (encoded.data.length - 2) / 2,
  },
  selfCheck: selfCheckEncoding(synthetic),
  componentCount: got.length,
  expectedCount: want.length,
  diffs,
  allPassed: got.length === want.length && diffs.length === 0,
}, null, 1));
