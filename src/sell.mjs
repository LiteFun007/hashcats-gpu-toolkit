// Exit module: everything that turns a minted cat back into money.
//
// Market infrastructure verified on Robinhood Chain (read-only eth_getCode):
//   Seaport 1.6  0x0000000000000068F116a894984e2DB1123eB395  deployed (23 981 bytes)
//   Permit2      0x000000000022D473030F116dDEE9F6B43aC78BA3  deployed (9 152 bytes)
//   OpenSea chain slug: "robinhood" (floor/bids live off-chain, in OpenSea's orderbook)
//
// Every write here simulates by default and only broadcasts with --send.
import { formatEther, formatUnits, parseAbi } from 'viem';
import { ABI, COLLECTION, publicClient, walletClient } from './chain.mjs';

export const SEAPORT_16 = '0x0000000000000068F116a894984e2DB1123eB395';
/** Offers are denominated in WETH on this chain; proceeds arrive wrapped. */
export const WETH = process.env.RH_WETH || '0x0bd7d308f8e1639fab988df18a8011f41eacad73';
/**
 * OpenSea's conduit on Robinhood Chain — the operator that actually moves a cat
 * during a sale. Verified, not guessed: 143 sellers approved exactly this address
 * (read from the collection's ApprovalForAll history), and approving it is what
 * turned the NotOwnerNorApproved() revert into the successful sale of cat #687.
 */
export const OPENSEA_CONDUIT = '0x963F00d3ff000064fFCbA824b800c0000000C300';

const ERC20 = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function symbol() view returns (string)',
]);

export const wethBalance = (pc, owner) =>
  pc.readContract({ address: WETH, abi: ERC20, functionName: 'balanceOf', args: [owner] });

/** Turn offer proceeds (WETH) back into native ETH. */
export async function unwrapWeth({ key, pc = publicClient(), amount = null, send = false }) {
  const wallet = walletClient(key);
  const bal = await wethBalance(pc, wallet.account.address);
  const value = amount === null ? bal : BigInt(amount);
  const tx = {
    address: WETH,
    abi: parseAbi(['function withdraw(uint256)']),
    functionName: 'withdraw',
    args: [value],
    account: wallet.account,
    chain: wallet.chain,
  };
  if (!send) {
    const { request } = await pc.simulateContract(tx);
    return { dryRun: true, from: wallet.account.address, amountWei: value.toString(), amountEth: formatEther(value), to: request.address };
  }
  const hash = await wallet.writeContract(tx);
  return { dryRun: false, from: wallet.account.address, amountWei: value.toString(), amountEth: formatEther(value), txHash: hash };
}

export async function sellStatus(pc, tokenId, owner, hashToken) {
  const read = (functionName, args) => pc.readContract({ address: COLLECTION, abi: ABI, functionName, args });
  const id = BigInt(tokenId);
  const out = { tokenId, owner };
  try { out.actualOwner = await read('ownerOf', [id]); } catch { out.actualOwner = 'ERR'; }
  const canBurn = await read('canBurn', [id]).catch((e) => `ERR:${e.shortMessage || e.message}`);
  if (typeof canBurn !== 'string') {
    const [now, secondGate, readyAt] = canBurn;
    out.burn = { canBurnNow: now, secondGate, readyAt: Number(readyAt), readyIn: Number(readyAt) - Math.floor(Date.now() / 1000) };
  } else out.burn = canBurn;
  out.burnRewardHASH = formatUnits(await read('burnReward', [id]).catch(() => 0n), 18);
  out.claimableETH = formatEther(await read('claimable', [id]).catch(() => 0n));
  out.approvedForSeaport = await read('isApprovedForAll', [out.actualOwner, SEAPORT_16]).catch(() => 'ERR');
  out.hashBalance = formatUnits(await pc.readContract({ address: hashToken, abi: ERC20, functionName: 'balanceOf', args: [out.actualOwner] }).catch(() => 0n), 18);
  out.wethBalance = formatEther(await wethBalance(pc, out.actualOwner).catch(() => 0n));
  return out;
}

async function write({ key, functionName, args, send, pc, label }) {
  const wallet = walletClient(key);
  const tx = { address: COLLECTION, abi: ABI, functionName, args, account: wallet.account, chain: wallet.chain };
  if (!send) {
    const { result, request } = await pc.simulateContract(tx);
    return { dryRun: true, label, from: wallet.account.address, simulatedResult: typeof result === 'bigint' ? result.toString() : result, to: request.address };
  }
  const hash = await wallet.writeContract(tx);
  return { dryRun: false, label, from: wallet.account.address, txHash: hash };
}

/** Send the cat to another wallet (cheapest, no marketplace needed). */
export const transferCat = ({ key, pc = publicClient(), to, tokenId, send = false }) =>
  write({ key, pc, functionName: 'safeTransferFrom', args: [walletClient(key).account.address, to, BigInt(tokenId)], send, label: `transfer #${tokenId} -> ${to}` });

/** Built-in exit: burn for $HASH (needs 10 min + one later cat; sellable only after cat 1016). */
export const burnCat = ({ key, pc = publicClient(), tokenId, send = false }) =>
  write({ key, pc, functionName: 'burn', args: [BigInt(tokenId)], send, label: `burn #${tokenId} -> $HASH` });

/** Collect the rent accrued to a cat from later-epoch mints. */
export const claimRent = ({ key, pc = publicClient(), tokenId, send = false }) =>
  write({ key, pc, functionName: 'claim', args: [BigInt(tokenId)], send, label: `claim rent #${tokenId}` });

/** One-time approval that lets OpenSea/Seaport move the cat when a listing is filled. */
export const approveSeaport = ({ key, pc = publicClient(), operator = SEAPORT_16, send = false }) =>
  write({ key, pc, functionName: 'setApprovalForAll', args: [operator, true], send, label: `approve ${operator} for all` });
