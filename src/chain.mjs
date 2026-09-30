// Hashcats chain binding: reads, work-hash layout, mint builder.
//
// Proven layout (verified against the on-chain pure view workHash()):
//   preimage = address(20) ‖ uint256BE(nonce) ‖ uint256BE(prevWork) ‖ bytes32(anchor)
//   digest   = keccak256(preimage)   (standard Keccak-256, single 136-byte block)
//   accept   = uint256BE(digest) < targetFor(miner)
import fs from 'node:fs';
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  concat,
  pad,
  toHex,
  hexToBytes,
  formatEther,
  formatGwei,
  parseEventLogs,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export const COLLECTION =
  process.env.HASHCATS_COLLECTION || '0xCA75DF55Cc9C476DB27a7375D1fc8E794cf80721';
export const RPC = process.env.RH_RPC || 'https://rpc.mainnet.chain.robinhood.com';
export const CHAIN_ID = 4663;

export const robinhood = {
  id: CHAIN_ID,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
  blockExplorers: { default: { name: 'Blockscout', url: 'https://robinhoodchain.blockscout.com' } },
};

export const ABI = JSON.parse(
  fs.readFileSync(new URL('./abi.json', import.meta.url), 'utf8'),
);

const b32 = (v) => pad(toHex(v), { size: 32 });

/** The exact 116-byte work preimage the contract recomputes. */
export function workPreimage(miner, nonce, prevWork, anchor) {
  return concat([
    miner.toLowerCase(),   // 20-byte address
    b32(BigInt(nonce)),      // 32 bytes, uint256 big-endian
    b32(BigInt(prevWork)),   // 32 bytes
    anchor,                  // 32 bytes (bytes32)
  ]);
}

/** Local keccak of the preimage, as a big-endian uint256. */
export function workHashLocal(miner, nonce, prevWork, anchor) {
  return BigInt(keccak256(workPreimage(miner, nonce, prevWork, anchor)));
}

/** Leading zero bits of a 32-byte hash (the site's "depth"). */
export function leadingZeroBits(hexOrBytes) {
  const bytes = typeof hexOrBytes === 'string' ? hexToBytes(hexOrBytes) : hexOrBytes;
  let bits = 0;
  for (const byte of bytes) {
    if (byte === 0) { bits += 8; continue; }
    let n = byte;
    while ((n & 0x80) === 0) { bits++; n <<= 1; }
    return bits;
  }
  return bits;
}

export function publicClient(rpc = RPC) {
  return createPublicClient({ transport: http(rpc) });
}

export function walletClient(privateKey, rpc = RPC) {
  return createWalletClient({
    account: privateKeyToAccount(privateKey),
    chain: robinhood,
    transport: http(rpc),
  });
}

const read = (pc, functionName, args) =>
  pc.readContract({ address: COLLECTION, abi: ABI, functionName, args });

/** Everything the miner and the operator need, in one round trip batch. */
export async function readState(pc = publicClient(), miner = null) {
  const [blockNumber, anchor, prevWork, currentTarget, mintPrice, totalMinted, epoch] =
    await Promise.all([
      pc.getBlockNumber(),
      read(pc, 'currentAnchor'),
      read(pc, 'prevWork'),
      read(pc, 'currentTarget'),
      read(pc, 'mintPrice'),
      read(pc, 'totalMinted'),
      read(pc, 'currentEpoch'),
    ]);
  const [anchorBlock, anchorHash] = anchor;
  const target = miner ? await read(pc, 'targetFor', [miner]) : currentTarget;
  return {
    l2Block: Number(blockNumber),
    anchorBlock: Number(anchorBlock),
    anchor: anchorHash,
    prevWork,
    currentTarget,
    target,
    targetBits: leadingZeroBits(b32(target)),
    mintPrice,
    mintPriceEth: formatEther(mintPrice),
    totalMinted: Number(totalMinted),
    epoch: Number(epoch),
  };
}

/** On-chain oracle for the same value we compute locally. */
export async function workHashOnChain(pc, miner, nonce, prevWork, anchor) {
  return read(pc, 'workHash', [miner, BigInt(nonce), BigInt(prevWork), anchor]);
}

/**
 * Build the mint transaction for a solution. Never sends unless `send` is set.
 * `mine(uint256 nonce, uint256 anchorBlock)` is payable — the entry price of the
 * current epoch is attached as value and the contract recomputes the hash.
 */
export async function mintSolution({
  privateKey,
  nonce,
  anchorBlock,
  pc = publicClient(),
  rpc = RPC,
  send = false,
  gas = null,
}) {
  const wallet = walletClient(privateKey, rpc);
  const miner = wallet.account.address;
  const price = await read(pc, 'mintPrice');
  const tx = {
    address: COLLECTION,
    abi: ABI,
    functionName: 'mine',
    args: [BigInt(nonce), BigInt(anchorBlock)],
    value: price,
    account: wallet.account,
    chain: robinhood,
  };
  if (gas) tx.gas = gas;
  if (!send) {
    const { request } = await pc.simulateContract(tx);
    return { dryRun: true, miner, price, priceEth: formatEther(price), request };
  }
  const hash = await wallet.writeContract(tx);
  return { dryRun: false, miner, price, priceEth: formatEther(price), hash };
}

export const fmt = { formatEther, formatGwei };

/** Token id of the cat minted by `txHash` (authoritative: read from the receipt). */
export async function mintedTokenId(pc, txHash, owner) {
  const receipt = await pc.waitForTransactionReceipt({ hash: txHash });
  const logs = parseEventLogs({ abi: ABI, eventName: 'Transfer', logs: receipt.logs });
  const zero = /^0x0{40}$/i;
  const mine = logs.find((l) => zero.test(l.args.from ?? '') && (l.args.to ?? '').toLowerCase() === owner.toLowerCase());
  return { receipt, tokenId: mine ? mine.args.tokenId : null };
}

/** Address of the $HASH ERC-20 that mints/burns feed. */
export const hashTokenAddress = (pc) =>
  pc.readContract({ address: COLLECTION, abi: ABI, functionName: 'hashToken' });
