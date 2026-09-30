// Exit probe: what a freshly minted cat can actually be turned into right now.
import { formatEther } from 'viem';
import { ABI, COLLECTION, publicClient } from '../src/chain.mjs';

const pc = publicClient();
const read = async (functionName, args) => {
  try { return await pc.readContract({ address: COLLECTION, abi: ABI, functionName, args }); }
  catch (err) { return `ERR:${err.shortMessage || err.message}`; }
};

const n = Number(await read('totalMinted'));
const epoch = Number(await read('currentEpoch'));
const price = await read('mintPrice');
const acc = await read('accPerCat');
const rows = [];
for (const id of [n - 20, n - 5, n].filter((i) => i > 0)) {
  const r = {
    tokenId: id,
    canBurn: String(await read('canBurn', [BigInt(id)])),
    burnRewardHASH: String(await read('burnReward', [BigInt(id)])),
    claimableETH: null,
  };
  const c = await read('claimable', [BigInt(id)]);
  r.claimableETH = typeof c === 'string' ? c : formatEther(c);
  rows.push(r);
}

const out = {
  totalMinted: n,
  epoch,
  mintPriceETH: formatEther(price),
  accPerCatETH: formatEther(acc),
  hashToken: String(await read('hashToken')),
  hook: String(await read('hook')),
  burnedCount: String(await read('burnedCount')),
  uniquesTaken: String(await read('uniquesTaken')),
  totalHashMinted: String(await read('totalHashMinted')),
  tradingOpensAtCat: 1016,
  catsUntilTrading: 1016 - n,
  examples: rows,
};
console.log(JSON.stringify(out, null, 1));
