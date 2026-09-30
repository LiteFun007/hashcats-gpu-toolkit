// Miner pool: drives N copies of the site's real CPU kernel and returns the
// first solution that also passes a local keccak check.
import { Worker } from 'node:worker_threads';
import { hexToBytes, pad, toHex } from 'viem';
import { leadingZeroBits, workHashLocal } from './chain.mjs';

const HOST = new URL('./worker-host.mjs', import.meta.url);

/**
 * @param {object} o
 * @param {string} o.miner       address whose work is being mined
 * @param {bigint|string} o.prevWork  work of the previous cat
 * @param {string} o.anchor      32-byte anchor hash (hex)
 * @param {bigint|string} o.target  threshold (uint256)
 * @param {number} [o.threads]   worker count (default: cpus-1, max 8)
 * @param {number} [o.durationMs] stop after this long (0 = forever)
 * @param {number} [o.startStream] first stream id (each worker gets stream = startStream+i)
 * @param {(e:object)=>void} [o.onEvent]
 * @returns {Promise<{nonce:bigint, hash:string, depth:number, thread:number, hashes:number}>}
 */
export function minePool({
  miner,
  prevWork,
  anchor,
  target,
  threads = Math.max(1, Math.min(8, (process.env.MINER_THREADS ? Number(process.env.MINER_THREADS) : 4))),
  durationMs = 0,
  startStream = 0,
  onEvent = () => {},
}) {
  const targetBytes = hexToBytes(pad(toHex(BigInt(target)), { size: 32 }));
  const start = Date.now();
  const total = { hashes: 0 };
  let best = { depth: -1, hex: null };
  const alive = new Set();

  return new Promise((resolve, reject) => {
    const stop = (code = 0) => {
      for (const w of alive) w.terminate();
      alive.clear();
      clearTimeout(timer);
      if (code !== 0) reject(new Error('mining stopped'));
    };
    let timer = null;
    if (durationMs > 0) timer = setTimeout(() => stop(1), durationMs);

    for (let i = 0; i < threads; i++) {
      const w = new Worker(HOST);
      alive.add(w);
      w.on('message', (msg) => {
        if (msg.type === 'progress') {
          total.hashes += msg.hashes;
          const elapsed = (Date.now() - start) / 1000;
          if (msg.bestDepth > best.depth) best = { depth: msg.bestDepth, hex: msg.best };
          onEvent({
            type: 'progress',
            thread: i,
            hashes: msg.hashes,
            ms: msg.ms,
            bestDepth: msg.bestDepth,
            best: msg.best,
            totalHashes: total.hashes,
            hashrate: total.hashes / Math.max(1, elapsed),
            elapsedMs: Date.now() - start,
          });
        } else if (msg.type === 'solution') {
          const nonce = BigInt(msg.nonce);
          const local = workHashLocal(miner, nonce, prevWork, anchor);
          const localHex = pad(toHex(local), { size: 32 });
          const ok = localHex === msg.hash && local < BigInt(target);
          onEvent({ type: 'solution', thread: i, nonce, hash: msg.hash, depth: msg.depth, verified: ok });
          if (ok) {
            for (const other of alive) other.terminate();
            alive.clear();
            clearTimeout(timer);
            resolve({
              nonce,
              hash: msg.hash,
              depth: msg.depth,
              thread: i,
              hashes: total.hashes,
              elapsedMs: Date.now() - start,
            });
          }
        } else if (msg.type === 'ready') {
          onEvent({ type: 'ready', thread: i, device: msg.device });
        }
      });
      w.on('error', reject);
      w.postMessage({ type: 'start', miner, prev: pad(toHex(BigInt(prevWork)), { size: 32 }), anchor, target: targetBytes, stream: startStream + i });
    }
  });
}
