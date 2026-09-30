// Pace probe: what difficulty the network is really at, and what hashrate that implies.
import { pad, toHex } from 'viem';
import { ABI, COLLECTION, publicClient, leadingZeroBits } from '../src/chain.mjs';

const pc = publicClient();
const read = (functionName, args) => pc.readContract({ address: COLLECTION, abi: ABI, functionName, args });
const ME = process.env.MINER_ADDR;
if (!ME) { console.error('set MINER_ADDR=0x… (the wallet you mine for)'); process.exit(1); }
const bitsOf = (v) => leadingZeroBits(pad(toHex(v), { size: 32 }));

const n = Number(await read('totalMinted'));
const ids = [];
for (let i = Math.max(1, n - 24); i <= n; i++) ids.push(BigInt(i));
const times = (await Promise.all(ids.map((id) => read('mintedAt', [id])))).map(Number);
const deltas = times.slice(1).map((t, i) => t - times[i]);
const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;

const epoch = Number(await read('currentEpoch'));
const [baseTarget, currentTarget, mine, burst, personal] = await Promise.all([
  read('baseTarget'), read('currentTarget'), read('targetFor', [ME]), read('currentBurst'), read('personalBurst', [ME]),
]);
const floor = await read('epochFloor', [BigInt(epoch)]);

const head = await pc.getBlockNumber();
const [b1, b0] = await Promise.all([pc.getBlock({ blockNumber: head }), pc.getBlock({ blockNumber: head - 500n })]);
const blockS = Number(b1.timestamp - b0.timestamp) / 500;

const bits = bitsOf(currentTarget);
const out = {
  totalMinted: n,
  lastMint: new Date(times.at(-1) * 1000).toISOString(),
  paceSeconds: { avg: +avg.toFixed(1), min: Math.min(...deltas), max: Math.max(...deltas), last10: deltas.slice(-10) },
  bits: { base: bitsOf(baseTarget), current: bits, mine: bitsOf(mine), epochFloor: bitsOf(floor) },
  targets: { baseTarget: baseTarget.toString(), currentTarget: currentTarget.toString(), floor: floor.toString(), mine: mine.toString() },
  burst: { network: burst.toString(), personal: personal.toString() },
  l2: { head: Number(head), blockSeconds: +blockS.toFixed(3), anchorWindowSeconds: +(250 * blockS).toFixed(1) },
  impliedNetworkHashrate: { atCurrentBits: (2 ** bits) / avg, atBaseBits: (2 ** bitsOf(baseTarget)) / avg },
};
out.impliedNetworkHashrate.atCurrentBitsGHs = +(out.impliedNetworkHashrate.atCurrentBits / 1e9).toFixed(2);
out.impliedNetworkHashrate.atBaseBitsGHs = +(out.impliedNetworkHashrate.atBaseBits / 1e9).toFixed(2);

// what one GPU of a given speed would need, in expectation, per cat
const GPU = { '4090 (5.06 GH/s)': 5.06e9, 'H100 PCIe (2.79 GH/s)': 2.79e9, '1050 Ti (250 MH/s)': 0.25e9, 'local CPU 4 threads (19 MH/s)': 19e6 };
out.expectedHoursPerCat = Object.fromEntries(
  Object.entries(GPU).map(([k, v]) => [k, +(((2 ** bits) / v) / 3600).toFixed(1)]),
);
console.log(JSON.stringify(out, null, 1));
