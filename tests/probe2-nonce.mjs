// Disambiguate the nonce slot for large nonces (multi-worker streams).
import { createPublicClient, http, keccak256, concat, pad, toHex, hexToBytes, bytesToHex } from 'viem';
const COLL = '0xCA75DF55Cc9C476DB27a7375D1fc8E794cf80721';
const ME = process.env.MINER_ADDR;
if (!ME) { console.error('set MINER_ADDR=0x… (the wallet you mine for)'); process.exit(1); }
const ABI = [
  { type: 'function', name: 'workHash', stateMutability: 'pure', inputs: [{ name: 'miner', type: 'address' }, { name: 'nonce', type: 'uint256' }, { name: 'prev', type: 'uint256' }, { name: 'anchor', type: 'bytes32' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'currentAnchor', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }, { type: 'bytes32' }] },
  { type: 'function', name: 'prevWork', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
];
const pc = createPublicClient({ transport: http('https://rpc.mainnet.chain.robinhood.com') });
const read = (functionName, args) => pc.readContract({ address: COLL, abi: ABI, functionName, args });
const [, anchor] = await read('currentAnchor');
const prev = await read('prevWork');
const addr = hexToBytes(ME), prevB = hexToBytes(pad(toHex(prev), { size: 32 })), anchorB = hexToBytes(anchor);
const mk = (nb, off) => { const head = new Uint8Array(52); head.set(addr, 0); head.set(nb, off); return concat([head, prevB, anchorB]); };
for (const nonce of [2n ** 33n + 1n, 2n ** 40n + 7n, 2n ** 64n + 5n, 2n ** 70n + 9n]) {
  const target = await read('workHash', [ME, nonce, prev, anchor]);
  const cands = [
    ['u256be@20', mk(hexToBytes(pad(toHex(nonce), { size: 32 })), 20)],
    ['u64be@44', mk(hexToBytes(pad(toHex(nonce > (2n ** 64n - 1n) ? 0n : nonce), { size: 8 })), 44)],
    ['u32be@48', mk(hexToBytes(pad(toHex(nonce > (2n ** 32n - 1n) ? 0n : nonce), { size: 4 })), 48)],
    ['u256le@20', mk(hexToBytes(pad(toHex(nonce), { size: 32 })).reverse(), 20)],
  ];
  const hits = cands.filter(([, b]) => BigInt(keccak256(b)) === target).map(([n]) => n);
  console.log(`nonce=2^${Math.log2(Number(nonce)).toFixed(0)} ~ ${nonce} ->`, hits.length ? 'MATCH: ' + hits.join(', ') : 'NO MATCH');
}
