// Telegram farm monitor: edits one status message every 30s and alerts on new cats.
// Setup:
//   1) Create a bot via @BotFather -> get token.
//   2) Open your bot in Telegram, press Start / send any message.
//   3) Run:  TG_TOKEN=123:abc node pod/tgbot.mjs
//      (chat id is auto-detected from getUpdates; or set TG_CHAT=... to pin it)
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createPublicClient, http, defineChain, formatEther } from 'viem';

const P = promisify(execFile);
const TOKEN = process.env.TG_TOKEN;
let CHAT = process.env.TG_CHAT || '';
const BURNER = process.env.MINER_ADDR || '0x1e0b1A112CBc934897e6433149e6a5f88B65F018';
const COLLECTION = '0xCA75DF55Cc9C476DB27a7375D1fc8E794cf80721';
const INTERVAL = 30000;
if (!TOKEN) { console.error('set TG_TOKEN=... (from @BotFather)'); process.exit(1); }

const api = async (method, body) => {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  return r.json();
};

const chain = defineChain({ id: 4663, name: 'Robinhood Chain', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: ['https://rpc.mainnet.chain.robinhood.com'] } } });
const pc = createPublicClient({ chain, transport: http('https://rpc.mainnet.chain.robinhood.com', { timeout: 20000 }) });
const erc721 = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'tokenOfOwnerByIndex', type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [{ type: 'uint256' }] },
];

async function speed() {
  try {
    const { stdout } = await P('bash', ['pod/mon.sh'], { cwd: process.cwd(), timeout: 120000 });
    const body = stdout.split('\n').filter((l) => l && !/^TAG/.test(l)).join('\n');
    return body.trim();
  } catch (e) { return '(mon.sh error: ' + e.message + ')'; }
}
async function chain_() {
  try {
    const [wei, cats] = await Promise.all([pc.getBalance({ address: BURNER }), pc.readContract({ address: COLLECTION, abi: erc721, functionName: 'balanceOf', args: [BURNER] })]);
    return { wei, cats: Number(cats) };
  } catch (e) { return { wei: null, cats: null, err: e.message }; }
}
async function latestTokenId(cats) {
  try { const id = await pc.readContract({ address: COLLECTION, abi: erc721, functionName: 'tokenOfOwnerByIndex', args: [BURNER, BigInt(cats - 1)] }); return id.toString(); } catch { return null; }
}

let msgId = null, prevCats = null;
async function ensureChat() {
  if (CHAT) return true;
  const u = await api('getUpdates', {});
  const list = (u && u.result) || [];
  for (let i = list.length - 1; i >= 0; i--) {
    const c = list[i].message && list[i].message.chat;
    if (c && c.id) { CHAT = String(c.id); console.log('detected chat id:', CHAT); return true; }
  }
  console.error('No chat id yet — open your bot in Telegram and send /start, then retry.');
  return false;
}

async function tick() {
  const sp = await speed();
  const { wei, cats, err } = await chain_();
  const now = new Date().toISOString().slice(11, 19);
  const eth = wei == null ? '?' : formatEther(wei);
  const mints = wei == null ? '?' : Math.floor(Number(wei) / 10.08e15);
  const text =
    `🐾 Hashcats farm\n` +
    `updated ${now} UTC\n\n` +
    `${sp}\n\n` +
    `🐱 cats: ${cats == null ? '?' : cats}` +
    (err ? `\n⚠️ ${err}` : '');
  if (!msgId) { const r = await api('sendMessage', { chat_id: CHAT, text }); msgId = r.result && r.result.message_id; }
  else { const r = await api('editMessageText', { chat_id: CHAT, message_id: msgId, text }); if (!r.ok && !/not modified/i.test(JSON.stringify(r))) console.log('edit:', JSON.stringify(r).slice(0, 120)); }
  if (cats != null) {
    if (prevCats != null && cats > prevCats) {
      const tid = await latestTokenId(cats);
      await api('sendMessage', { chat_id: CHAT, text: `🐱🎉 NEW CAT MINTED! total = ${cats}${tid ? `\ntoken id: ${tid}` : ''}\nsell: node cli.mjs sell status --token-id ${tid || '<id>'}` });
    }
    prevCats = cats;
  }
}

(async () => {
  if (!(await ensureChat())) process.exit(1);
  console.log('tg farm monitor started; chat=', CHAT, 'every', INTERVAL / 1000, 's');
  await tick();
  setInterval(() => tick().catch((e) => console.log('tick err', e.message)), INTERVAL);
})();
