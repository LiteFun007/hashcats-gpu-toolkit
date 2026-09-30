// hashcats pod miner — signer daemon (v2: RPC fallback).
// Holds the burner key, signs and broadcasts mint transactions via the
// Robinhood Chain RPC (with drpc.org fallback on rate-limit).
// Usage: node signer.mjs
//   env: KEY_FILE=./evm.key  RPC_URL=...  RPC_FALLBACK=...  PORT=8787
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { createWalletClient, createPublicClient, defineChain, http as viemHttp, fallback } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const PORT = Number(process.env.PORT || 8787);
const RPC = process.env.RPC_URL || 'https://rpc.mainnet.chain.robinhood.com';
const RPC_FALLBACK = process.env.RPC_FALLBACK || 'https://robinhood.drpc.org';
const KEY_FILE = process.env.KEY_FILE || new URL('./evm.key', import.meta.url).pathname;

let key = readFileSync(KEY_FILE, 'utf8').trim();
if (!key.startsWith('0x')) key = '0x' + key;
const account = privateKeyToAccount(key);

const chain = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
  blockExplorers: { default: { name: 'Blockscout', url: 'https://robinhoodchain.blockscout.com' } },
});

const transport = fallback(
  [viemHttp(RPC, { timeout: 20000, retryCount: 2 }), viemHttp(RPC_FALLBACK, { timeout: 15000, retryCount: 3 })],
  { rank: false },
);
const wallet = createWalletClient({ account, chain, transport });
const pub = createPublicClient({ chain, transport });

const toBig = (v) => (v == null ? undefined : typeof v === 'string' ? BigInt(v) : BigInt(v));

async function handle(method, params = []) {
  switch (method) {
    case 'eth_accounts':
    case 'eth_requestAccounts':
      return [account.address];
    case 'eth_chainId':
      return '0x1237';
    case 'net_version':
      return '4663';
    case 'wallet_requestPermissions':
      return [{ parentCapability: 'eth_accounts' }];
    case 'wallet_switchEthereumChain':
    case 'wallet_addEthereumChain':
      return null;
    case 'eth_sendTransaction': {
      const tx = params[0] || {};
      const hash = await wallet.sendTransaction({
        to: tx.to,
        data: tx.data,
        value: toBig(tx.value),
        gas: toBig(tx.gas),
        nonce: tx.nonce != null ? Number(tx.nonce) : undefined,
        maxFeePerGas: tx.maxFeePerGas ? toBig(tx.maxFeePerGas) : undefined,
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? toBig(tx.maxPriorityFeePerGas) : undefined,
        gasPrice: tx.gasPrice ? toBig(tx.gasPrice) : undefined,
      });
      console.log(new Date().toISOString(), 'SENT', hash, 'to', tx.to, 'value', tx.value);
      return hash;
    }
    case 'personal_sign': {
      const [data] = params;
      return await wallet.signMessage({ message: { raw: data } });
    }
    case 'eth_sign': {
      const [, data] = params;
      return await wallet.signMessage({ message: { raw: data } });
    }
    case 'eth_signTypedData_v4':
    case 'eth_signTypedData_v3':
    case 'eth_signTypedData': {
      const [, json] = params;
      const typed = JSON.parse(json);
      delete typed.EIP712Domain;
      return await wallet.signTypedData({
        domain: typed.domain,
        types: typed.types,
        primaryType: typed.primaryType,
        message: typed.message,
      });
    }
    default: {
      // read-only methods: straight through to the public RPC (with fallback)
      let lastErr = null;
      for (const url of [RPC, RPC_FALLBACK]) {
        let r = null;
        try {
          r = await fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
          });
        } catch (e) {
          lastErr = e;
          continue;
        }
        let j = null;
        try { j = await r.json(); } catch (e) { lastErr = e; continue; }
        if (!j) { lastErr = new Error('empty response'); continue; }
        if (j.error) {
          if (j.error.code === -32000 || /rate|limit/i.test(String(j.error.message || ''))) {
            lastErr = new Error(j.error.message);
            continue;
          }
          const e = new Error(j.error.message);
          e.code = j.error.code;
          e.data = j.error.data;
          throw e;
        }
        return j.result;
      }
      throw lastErr || new Error('rpc unreachable');
    }
  }
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }
  if (req.method === 'GET') {
    pub.getBalance({ address: account.address })
      .then((wei) => {
        res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({
          address: account.address,
          balanceWei: wei.toString(),
          balanceEth: (Number(wei) / 1e18).toFixed(6),
          rpc: RPC,
          rpcFallback: RPC_FALLBACK,
        }));
      })
      .catch((e) => {
        res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ address: account.address, error: String(e.message) }));
      });
    return;
  }
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', async () => {
    let msg;
    try { msg = JSON.parse(body || '{}'); } catch { res.writeHead(400).end('bad json'); return; }
    try {
      const result = await handle(msg.method, msg.params);
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ result }));
    } catch (err) {
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({
        error: { code: err.code ?? -32603, message: String(err.shortMessage || err.message || err), data: err.data },
      }));
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`signer daemon on http://127.0.0.1:${PORT}`);
  console.log('address:', account.address);
});
