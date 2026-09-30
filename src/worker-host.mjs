// Runs the site's own CPU miner module inside a node:worker_threads worker.
// The module is loaded verbatim from vendor/cpu.worker.js (extracted from
// https://hashcats.fun/assets/cpu.worker-CzK-dBIZ.js); it computes keccak with
// its embedded WebAssembly pair-lane kernel. We only supply the `self` global
// the module expects and forward messages to the parent thread.
import { parentPort } from 'node:worker_threads';

const self = {
  onmessage: null,
  postMessage: (msg) => parentPort.postMessage(msg),
};
globalThis.self = self;
parentPort.on('message', (data) => self.onmessage && self.onmessage({ data }));

await import(new URL('../vendor/cpu.worker.js', import.meta.url));
