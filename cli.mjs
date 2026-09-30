#!/usr/bin/env node
// Hashcats headless client — connect, mine, mint. No browser, no extension.
//
//   node cli.mjs state                     live chain state (read-only)
//   node cli.mjs oracle --nonce 12345      proves the local hash layout against the chain
//   node cli.mjs bench --seconds 10        measure hashrate of the real kernel
//   node cli.mjs mine --threads 4          mine the current real target
//   node cli.mjs mine --bits 22 --seconds 60   engine self-test on a synthetic target
//   node cli.mjs mint --nonce N --anchor-block B          dry run (simulate)
//   node cli.mjs mint --nonce N --anchor-block B --send   broadcast (needs a key)
//
// Writes are never implicit: mint only broadcasts with --send.
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { pad, toHex, hexToBytes, formatEther, parseEther } from 'viem';
import {
  ABI, COLLECTION, RPC, CHAIN_ID,
  publicClient, readState, workHashLocal, workHashOnChain, leadingZeroBits,
  mintSolution, walletClient, hashTokenAddress, mintedTokenId,
} from './src/chain.mjs';
import {
  SEAPORT_16, OPENSEA_CONDUIT, sellStatus, transferCat, burnCat, claimRent, approveSeaport, unwrapWeth,
} from './src/sell.mjs';
import { collectionInfo, fetchOffers, acceptBestOffer, acceptOfferTx, encodeFulfillment } from './src/opensea.mjs';
import { minePool } from './src/miner.mjs';

const argv = process.argv.slice(2);
const cmd = argv[0] && !argv[0].startsWith('-') ? argv[0] : 'state';
const sub = cmd === 'sell' && argv[1] && !argv[1].startsWith('-') ? argv[1] : null;
const { values: opt } = parseArgs({
  args: argv.slice(cmd === argv[0] ? (sub ? 2 : 1) : 0),
  options: {
    nonce: { type: 'string' },
    'anchor-block': { type: 'string' },
    threads: { type: 'string' },
    seconds: { type: 'string' },
    bits: { type: 'string' },
    address: { type: 'string' },
    miner: { type: 'string' },
    'key-file': { type: 'string' },
    dump: { type: 'string' },
    stream: { type: 'string' },
    gas: { type: 'string' },
    send: { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
    'token-id': { type: 'string' },
    to: { type: 'string' },
    operator: { type: 'string' },
    conduit: { type: 'boolean', default: false },
    price: { type: 'string' },
    'api-key': { type: 'string' },
    'fulfillment-file': { type: 'string' },
    'min-price': { type: 'string' },
    amount: { type: 'string' },
    slug: { type: 'string' },
  },
  allowPositionals: false,
});

const pc = publicClient();
const num = (v, d) => (v === undefined ? d : Number(v));
const print = (o) => console.log(opt.json ? JSON.stringify(o, null, 1) : o);

const KEY_ENV = 'HASHCATS_PRIVATE_KEY';
const KEY_CANDIDATES = [() => opt['key-file'], () => 'evm.key', () => process.env.HASHCATS_KEY_FILE];
function loadKey() {
  if (process.env[KEY_ENV]) return normKey(process.env[KEY_ENV].trim());
  for (const c of KEY_CANDIDATES) {
    const f = c();
    if (f && fs.existsSync(f)) return normKey(fs.readFileSync(f, 'utf8').trim());
  }
  throw new Error(`no key: set ${KEY_ENV} or --key-file (default ./evm.key)`);
}
const normKey = (k) => (k.startsWith('0x') ? k : `0x${k}`);
const addressOf = (key) => walletClient(normKey(key)).account.address;
function resolveMiner() {
  if (opt.address) return opt.address;
  if (opt.miner) return opt.miner;
  if (process.env.HASHCATS_MINER) return process.env.HASHCATS_MINER;
  for (const c of KEY_CANDIDATES) {
    const f = c();
    if (f && fs.existsSync(f)) {
      const k = fs.readFileSync(f, 'utf8').trim();
      if (/^(0x)?[0-9a-fA-F]{64}$/.test(k)) return addressOf(k);
    }
  }
  return null;
}

const HELP = `hashcats headless client (unofficial, reconstructed)
  state                                   live chain state
  send --to 0x.. --amount 0.001 [--send]  move ETH out of the miner wallet
  oracle --nonce <n> [--address 0x..]     local keccak vs on-chain workHash
  bench [--seconds 10] [--threads 4]      hashrate of the real CPU kernel
  mine [--threads 4] [--seconds 0]        mine the live target
       [--bits 22]                        self-test on an easy synthetic target
       [--address 0x.. | --key-file f]
  run  [--threads 4] [--seconds 300] [--send]   mine in rounds, refresh state, mint a find
       [--dump transfer:0x.. | approve | none]  act on the cat right after it mints
  mint --nonce <n> --anchor-block <b> [--send]
                                          simulate, or broadcast with --send
  sell status --token-id <n>              owner, burn gates/reward, claimable rent, approvals
  sell transfer --token-id <n> --to 0x..  send the cat to another wallet  [--send]
  sell burn     --token-id <n>            burn for $HASH (10 min + 1 later cat)  [--send]
  sell claim    --token-id <n>            collect accrued rent  [--send]
  sell approve  [--operator 0x.. | --conduit]   approve Seaport (default) or OpenSea's conduit  [--send]
  sell unwrap   [--amount <wei>]          turn offer proceeds (WETH) into ETH  [--send]
  sell market   [--slug hash-cats]        collection fees/currencies/supply (no key needed)
  sell offers   [--threads 10]            live offer ladder: price, expiry, offerer
  sell accept   --token-id <n> [--api-key <k> | --fulfillment-file <f>] [--send]
                                          take the best live offer (pays WETH); walks the
                                          ladder from the top, simulates before sending
                                          [--min-price 0.16] refuse anything cheaper
options: --json  --key-file <f>  --threads  --seconds  --bits  --stream  --gas  --api-key  --fulfillment-file  --min-price  --slug  --to  --amount`;

if (opt.help) { console.log(HELP); process.exit(0); }

if (cmd === 'state') {
  const miner = resolveMiner();
  const s = await readState(pc, miner);
  print({
    collection: COLLECTION, chainId: CHAIN_ID, rpc: RPC, miner: miner || '(no wallet)',
    l2Block: s.l2Block, anchorBlock: s.anchorBlock, anchor: s.anchor,
    prevWork: s.prevWork.toString(), epoch: s.epoch, totalMinted: s.totalMinted,
    targetBits: s.targetBits, target: s.target.toString(),
    mintPriceEth: s.mintPriceEth, expectedHashes: `~2^${s.targetBits}`,
  });
  process.exit(0);
}

if (cmd === 'oracle') {
  if (!opt.nonce) throw new Error('oracle needs --nonce <n>');
  const miner = opt.address || resolveMiner();
  if (!miner) throw new Error('oracle needs --address 0x.. (or a key file to read it from)');
  const s = await readState(pc);
  const nonce = BigInt(opt.nonce);
  const local = workHashLocal(miner, nonce, s.prevWork, s.anchor);
  const onchain = await workHashOnChain(pc, miner, nonce, s.prevWork, s.anchor);
  print({
    miner, nonce: nonce.toString(), prevWork: s.prevWork.toString(), anchorBlock: s.anchorBlock,
    local: pad(toHex(local), { size: 32 }), onchain: pad(toHex(onchain), { size: 32 }),
    match: local === onchain, depth: leadingZeroBits(pad(toHex(local), { size: 32 })),
    targetBits: s.targetBits, belowTarget: local < s.target,
  });
  process.exit(local === onchain ? 0 : 1);
}

if (cmd === 'bench' || cmd === 'mine') {
  const miner = resolveMiner();
  if (!miner) throw new Error('mine needs --address 0x.. or a key file');
  const s = await readState(pc, miner);
  const seconds = num(opt.seconds, cmd === 'bench' ? 10 : 0);
  const threads = num(opt.threads, 4);
  const synthetic = opt.bits ? (2n ** BigInt(256 - Number(opt.bits))) - 1n : null;
  const target = synthetic ?? s.target;
  const bits = synthetic ? Number(opt.bits) : s.targetBits;
  console.log(`miner ${miner}`);
  console.log(`epoch ${s.epoch} · mined ${s.totalMinted} · price ${s.mintPriceEth} ETH · target ${bits} bits${synthetic ? ' (SYNTHETIC self-test target)' : ''}`);
  console.log(`anchor block ${s.anchorBlock} · prevWork ${s.prevWork}`);
  const t0 = Date.now();
  let last = t0, lastHashes = 0;
  try {
    const sol = await minePool({
      miner, prevWork: s.prevWork, anchor: s.anchor, target,
      threads, durationMs: seconds * 1000, startStream: num(opt.stream, 0),
      onEvent: (e) => {
        if (e.type === 'ready') console.log(`  thread ${e.thread}: ${e.device}`);
        if (e.type === 'progress') {
          const now = Date.now();
          if (now - last > 1500) {
            const inst = (e.totalHashes - lastHashes) / ((now - last) / 1000);
            const etaH = (2 ** bits) / Math.max(1, e.hashrate);
            console.log(`  ${(e.hashrate / 1e6).toFixed(1)} MH/s (${(inst / 1e6).toFixed(1)} MH/s now) · ${e.totalHashes.toLocaleString()} hashes · best depth ${e.bestDepth} · ETA ~${(etaH / 3600).toFixed(1)} h/thread-set`);
            last = now; lastHashes = e.totalHashes;
          }
        }
      },
    });
    console.log('SOLUTION', JSON.stringify({ nonce: sol.nonce.toString(), hash: sol.hash, depth: sol.depth, thread: sol.thread, elapsedMs: sol.elapsedMs, hashes: sol.hashes }));
    const onchain = await workHashOnChain(pc, miner, sol.nonce, s.prevWork, s.anchor);
    console.log('on-chain workHash matches:', pad(toHex(onchain), { size: 32 }) === sol.hash, '| below live target:', onchain < s.target);
    if (!synthetic) {
      console.log(`mint it: node cli.mjs mint --nonce ${sol.nonce} --anchor-block ${s.anchorBlock} [--send]`);
    } else {
      console.log('(synthetic target: engine self-test only — the chain would reject this nonce)');
    }
  } catch (err) {
    console.log(`stopped after ${((Date.now() - t0) / 1000).toFixed(0)}s: ${err.message}`);
  }
  process.exit(0);
}

if (cmd === 'send') {
  if (!opt.to) throw new Error('send needs --to 0x..');
  if (!opt.amount) throw new Error('send needs --amount <eth>');
  const key = loadKey();
  const wallet = walletClient(key);
  const value = parseEther(opt.amount);
  const tx = { to: opt.to, value, account: wallet.account, chain: wallet.chain };
  try {
    if (!opt.send) {
      const [gas, fees] = await Promise.all([pc.estimateGas(tx), pc.estimateFeesPerGas()]);
      print({
        dryRun: true, from: wallet.account.address, to: opt.to, eth: opt.amount,
        estimatedGas: gas.toString(), maxFeePerGas: fees.maxFeePerGas?.toString(), costEth: formatEther(gas * (fees.maxFeePerGas ?? 0n) + value),
      });
      process.exit(0);
    }
    const hash = await wallet.sendTransaction(tx);
    const receipt = await pc.waitForTransactionReceipt({ hash });
    print({ sent: true, from: wallet.account.address, to: opt.to, eth: opt.amount, txHash: hash, status: receipt.status });
    process.exit(0);
  } catch (err) {
    console.error(`send ${opt.send ? 'failed' : 'simulation reverted'}: ${err.shortMessage || err.message}`);
    process.exit(2);
  }
}

if (cmd === 'sell') {
  const tokenId = opt['token-id'] ? BigInt(opt['token-id']) : null;
  const key = ['transfer', 'burn', 'claim', 'approve', 'accept', 'unwrap'].includes(sub) ? loadKey() : null;
  const hashToken = await hashTokenAddress(pc);
  if (sub === 'market') {
    print(await collectionInfo(opt.slug));
    process.exit(0);
  }
  if (sub === 'offers') {
    const apiKey = opt['api-key'] || process.env.OPENSEA_API_KEY;
    if (!apiKey) throw new Error('sell offers needs --api-key (or OPENSEA_API_KEY)');
    const ladder = await fetchOffers({ slug: opt.slug || undefined, apiKey, limit: Number(opt.threads || 10) });
    const now = Math.floor(Date.now() / 1000);
    print(ladder.map((o) => ({
      eth: o.priceWei ? formatEther(BigInt(o.priceWei)) : null,
      expiresIn: o.endTime ? `${Math.max(0, o.endTime - now)}s` : null,
      offerer: o.offerer,
      orderHash: o.orderHash,
    })));
    process.exit(0);
  }
  if (sub === 'accept') {
    try {
      if (tokenId === null) throw new Error('needs --token-id N');
      const apiKey = opt['api-key'] || process.env.OPENSEA_API_KEY;
      if (opt['fulfillment-file']) {
        const raw = JSON.parse(fs.readFileSync(opt['fulfillment-file'], 'utf8'));
        const tx = raw.fulfillment_data?.transaction ?? raw.transaction ?? raw;
        const out = await acceptOfferTx({ key, transaction: tx, pc, send: opt.send });
        print({ ...out, selector: encodeFulfillment(tx).data.slice(0, 10) });
      } else if (apiKey) {
        // one process: read the live best offer and its fulfillment, then send.
        // OpenSea's zone authorisation is short-lived, so a cached payload expires.
        print(await acceptBestOffer({
          key, pc, slug: opt.slug || undefined, tokenId, apiKey, send: opt.send,
          minPriceWei: opt['min-price'] ? parseEther(opt['min-price']) : 0n,
        }));
      } else {
        throw new Error('no order data: pass --api-key (or OPENSEA_API_KEY), or --fulfillment-file with OpenSea fulfillment_data');
      }
      process.exit(0);
    } catch (err) {
      console.error(`sell accept ${opt.send ? 'failed' : 'dry run failed'}: ${err.shortMessage || err.message}`);
      process.exit(2);
    }
  }
  if (!sub || sub === 'status') {
    if (tokenId === null) throw new Error('sell status needs --token-id');
    print(await sellStatus(pc, tokenId, opt.address || resolveMiner(), hashToken));
    process.exit(0);
  }
  if (sub === 'unwrap') {
    try {
      const run = await unwrapWeth({ key, pc, amount: opt.amount ? BigInt(opt.amount) : null, send: opt.send });
      print(run);
      process.exit(0);
    } catch (err) {
      console.error(`sell unwrap ${opt.send ? 'failed' : 'simulation reverted'}: ${err.shortMessage || err.message}`);
      process.exit(2);
    }
  }
  if (['transfer', 'burn', 'claim', 'approve'].includes(sub)) {
    if (tokenId === null && sub !== 'approve') throw new Error(`sell ${sub} needs --token-id`);
    const run = {
      transfer: () => transferCat({ key, pc, to: opt.to, tokenId, send: opt.send }),
      burn: () => burnCat({ key, pc, tokenId, send: opt.send }),
      claim: () => claimRent({ key, pc, tokenId, send: opt.send }),
      approve: () => approveSeaport({ key, pc, operator: opt.conduit ? OPENSEA_CONDUIT : (opt.operator || SEAPORT_16), send: opt.send }),
    }[sub];
    if (sub === 'transfer' && !opt.to) throw new Error('sell transfer needs --to 0x..');
    try {
      print(await run());
    } catch (err) {
      console.error(`sell ${sub} ${opt.send ? 'failed' : 'simulation reverted'}: ${err?.cause?.data?.errorName || err?.cause?.reason || err?.shortMessage || err.message}`);
      process.exit(2);
    }
    process.exit(0);
  }
  console.error(`unknown sell mode "${sub}" — use status|transfer|burn|claim|approve`);
  process.exit(1);
}

if (cmd === 'mint') {
  if (!opt.nonce || !opt['anchor-block']) throw new Error('mint needs --nonce and --anchor-block');
  const key = loadKey();
  try {
    const out = await mintSolution({
      privateKey: key, nonce: opt.nonce, anchorBlock: opt['anchor-block'],
      pc, send: opt.send, gas: opt.gas ? BigInt(opt.gas) : null,
    });
    print(opt.send
      ? { sent: true, miner: out.miner, priceEth: out.priceEth, txHash: out.hash }
      : { dryRun: true, miner: out.miner, priceEth: out.priceEth, wouldCall: `mine(${opt.nonce}, ${opt['anchor-block']})` });
    process.exit(0);
  } catch (err) {
    const name = err?.cause?.data?.errorName || err?.cause?.reason || err?.shortMessage || err.message;
    console.error(`${opt.send ? 'mint failed' : 'simulation reverted'}: ${name}`);
    process.exit(2);
  }
}

if (cmd === 'run') {
  const miner = resolveMiner();
  if (!miner) throw new Error('run needs --address 0x.. or a key file');
  const threads = num(opt.threads, 4);
  const roundS = num(opt.seconds, 300);
  let last = Date.now(), lastHashes = 0;
  const log = (bits) => (e) => {
    if (e.type === 'ready') console.log(`  thread ${e.thread}: ${e.device}`);
    if (e.type === 'progress') {
      const now = Date.now();
      if (now - last < 3000) return;
      const inst = (e.totalHashes - lastHashes) / ((now - last) / 1000);
      const etaH = (2 ** bits) / Math.max(1, e.hashrate);
      console.log(`  ${(e.hashrate / 1e6).toFixed(1)} MH/s (${(inst / 1e6).toFixed(1)} now) · ${e.totalHashes.toLocaleString()} hashes · best ${e.bestDepth} · ETA ~${(etaH / 3600).toFixed(1)} h`);
      last = now; lastHashes = e.totalHashes;
    }
  };
  for (;;) {
    const s = await readState(pc, miner);
    console.log(`[run] epoch ${s.epoch} · mined ${s.totalMinted} · target ${s.targetBits} bits · anchor ${s.anchorBlock} · prevWork ${s.prevWork}`);
    last = Date.now(); lastHashes = 0;
    let sol = null;
    try {
      sol = await minePool({
        miner, prevWork: s.prevWork, anchor: s.anchor, target: s.target,
        threads, durationMs: roundS * 1000, onEvent: log(s.targetBits),
      });
    } catch (err) {
      console.log(`[run] round ended without a find (${err.message}) — refreshing state`);
      continue;
    }
    console.log(`[run] SOLUTION nonce=${sol.nonce} hash=${sol.hash} depth=${sol.depth} after ${(sol.elapsedMs / 1000).toFixed(1)}s`);
    const onchain = await workHashOnChain(pc, miner, sol.nonce, s.prevWork, s.anchor);
    const fresh = await readState(pc, miner);
    if (onchain >= s.target || fresh.prevWork !== s.prevWork) {
      console.log('[run] stale: another cat landed or the target moved — restarting');
      continue;
    }
    if (!opt.send) {
      console.log(`[run] dry run: node cli.mjs mint --nonce ${sol.nonce} --anchor-block ${s.anchorBlock} --send`);
      continue;
    }
    try {
      const out = await mintSolution({ privateKey: loadKey(), nonce: sol.nonce, anchorBlock: s.anchorBlock, pc, send: true });
      console.log(`[run] MINTED price ${out.priceEth} ETH tx ${out.hash}`);
      const { tokenId } = await mintedTokenId(pc, out.hash, out.miner);
      if (tokenId === null) {
        console.log('[run] could not identify the minted token id from the receipt');
      } else {
        console.log(`[run] cat #${tokenId} is in ${out.miner}`);
        const dump = opt.dump || 'none';
        if (dump === 'approve' || dump.startsWith('list')) {
          const a = await approveSeaport({ key: loadKey(), pc, send: true });
          console.log(`[run] approved Seaport 1.6 for ${a.from} tx ${a.txHash}`);
        }
        if (dump.startsWith('transfer:')) {
          const to = dump.split(':')[1];
          const t = await transferCat({ key: loadKey(), pc, to, tokenId, send: true });
          console.log(`[run] dumped #${tokenId} -> ${to} tx ${t.txHash}`);
        }
        const st = await sellStatus(pc, tokenId, out.miner, await hashTokenAddress(pc));
        console.log(`[run] sell status: ${JSON.stringify(st)}`);
        if (dump === 'none') console.log(`[run] dump it with: node cli.mjs sell transfer --token-id ${tokenId} --to 0x.. --send`);
      }
    } catch (err) {
      console.log(`[run] mint failed: ${err.shortMessage || err.message}`);
    }
  }
}

console.log(HELP);
process.exit(1);
