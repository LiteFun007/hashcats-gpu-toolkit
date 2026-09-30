// Probe: determine the exact workHash preimage layout by comparing local
// keccak256 candidates against the on-chain pure view workHash() (ground truth).
import { createPublicClient, http, keccak256, concat, pad, toHex, hexToBytes, bytesToHex } from 'viem';

const RPC = process.env.RH_RPC || 'https://rpc.mainnet.chain.robinhood.com';
const COLL = '0xCA75DF55Cc9C476DB27a7375D1fc8E794cf80721';
const ME = process.env.MINER_ADDR;
if (!ME) { console.error('set MINER_ADDR=0x… (the wallet you mine for)'); process.exit(1); }

const ABI = [
  { type: 'function', name: 'workHash', stateMutability: 'pure', inputs: [{ name: 'miner', type: 'address' }, { name: 'nonce', type: 'uint256' }, { name: 'prev', type: 'uint256' }, { name: 'anchor', type: 'bytes32' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'currentAnchor', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }, { type: 'bytes32' }] },
  { type: 'function', name: 'prevWork', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'currentTarget', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'targetFor', stateMutability: 'view', inputs: [{ name: 'miner', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'mintPrice', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'totalMinted', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'currentEpoch', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
];

const pc = createPublicClient({ transport: http(RPC) });
const read = (functionName, args) => pc.readContract({ address: COLL, abi: ABI, functionName, args });

const [anchorBlock, anchor] = await read('currentAnchor');
const prev = await read('prevWork');
const target = await read('currentTarget');
const mineTarget = await read('targetFor', [ME]);
const price = await read('mintPrice');
const minted = await read('totalMinted');

const be = (v, n) => hexToBytes(pad(toHex(v), { size: n }));
const le = (v, n) => hexToBytes(pad(toHex(v), { size: n })).reverse();
const addr = hexToBytes(ME);
const prevB = be(prev, 32), anchorB = hexToBytes(anchor);

// preimage = 116 bytes: [0..19]=addr, [20..51]=nonce area, [52..83]=prev, [84..115]=anchor
function build(nonceBytes, offset) {
  const head = new Uint8Array(52);
  head.set(addr, 0);
  head.set(nonceBytes, offset);
  return concat([head, prevB, anchorB]);
}

function candidates(nonce) {
  const out = [];
  // Builders are lazy: a nonce that does not fit a narrow slot is skipped, not fatal.
  const variants = [
    ['u256be', () => be(nonce, 32), 20],
    ['u256le', () => le(nonce, 32), 20],
    ['u64be@44', () => be(nonce, 8), 44],
    ['u64le@44', () => le(nonce, 8), 44],
    ['u64be@40', () => be(nonce, 8), 40],
    ['u64le@40', () => le(nonce, 8), 40],
    ['u64be@20', () => be(nonce, 8), 20],
    ['u64le@20', () => le(nonce, 8), 20],
    ['u64be@24', () => be(nonce, 8), 24],
    ['u64le@24', () => le(nonce, 8), 24],
    ['u64be@48', () => be(nonce, 8), 48],
    ['u64le@48', () => le(nonce, 8), 48],
    ['u32be@44', () => be(nonce, 4), 44],
    ['u32le@44', () => le(nonce, 4), 44],
    ['u32be@48', () => be(nonce, 4), 48],
    ['u32le@48', () => le(nonce, 4), 48],
  ];
  for (const [name, make, off] of variants) {
    try { out.push([name, build(make(), off)]); } catch (_) {}
  }
  return out;
}

const rev = (hex) => bytesToHex(hexToBytes(hex).reverse());

console.log('anchorBlock', anchorBlock.toString(), 'anchor', anchor);
console.log('prev', prev.toString());
console.log('target', target.toString(), '| targetFor(me)', mineTarget.toString());
console.log('mintPrice wei', price.toString(), '=', Number(price) / 1e18, 'ETH | minted', minted.toString());
console.log('RPC', RPC, '| miner', ME, '\n');

for (const nonce of [1n, 2n, 12345n, 4815162342n, 2n ** 40n + 7n]) {
  const onchain = await read('workHash', [ME, nonce, prev, anchor]);
  const ocHex = pad(toHex(onchain), { size: 32 });
  const hits = [];
  for (const [name, bytes] of candidates(nonce)) {
    const local = keccak256(bytes);
    const asU256 = BigInt(local);
    const asU256rev = BigInt(rev(local));
    if (asU256 === onchain) hits.push(`${name}`);
    else if (asU256rev === onchain) hits.push(`${name} (digest reversed)`);
  }
  console.log(`nonce=${nonce} onchain=${ocHex} ->`, hits.length ? 'MATCH: ' + hits.join(', ') : 'NO MATCH');
}
