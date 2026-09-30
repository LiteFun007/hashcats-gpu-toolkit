// hashcats pod miner — headless Chrome runner (v3).
// v3: exposeFunction bridge (CSP-proof) for the shim, better connect flow.
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME || 'google-chrome';
const CDP_PORT = process.env.CDP_PORT || '9222';
const PROFILE = '/tmp/chrome-miner';
const MINE_URL = 'https://hashcats.fun/mine';
const MINER_ADDR = process.env.MINER_ADDR;
if (!MINER_ADDR) throw new Error('MINER_ADDR env is required (the wallet you mine for)');
mkdirSync(PROFILE, { recursive: true });

const _short = new RegExp(MINER_ADDR.slice(0,6) + '[.·…]{1,3}' + MINER_ADDR.slice(-4), 'i');
const hasAddr = (t) =>
  new RegExp(MINER_ADDR.slice(2), 'i').test(t) || _short.test(t);

const chrome = spawn(CHROME, [
  '--headless=new',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-web-security',
  '--enable-gpu',
  '--use-angle=vulkan',
  '--enable-features=Vulkan',
  '--disable-vulkan-surface',
  '--enable-unsafe-webgpu',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  '--remote-debugging-port=' + CDP_PORT,
  '--user-data-dir=' + PROFILE,
  'about:blank',
], { stdio: ['ignore', 'inherit', 'inherit'] });
chrome.on('exit', (c) => console.log('[chrome] exited', c));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(3000);

const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${CDP_PORT}`, defaultViewport: null });
const [page] = await browser.pages();
page.on('console', (m) => {
  const t = m.text();
  if (!/Download the React|TensorFlow Lite|\[object Object\]/.test(t)) console.log('[page]', m.type(), t.slice(0, 220));
});

// Bridge: page <-> node <-> signer daemon. CDP binding is not subject to page CSP.
await page.exposeFunction('__podminerCall', async (payload) => {
  try {
    const r = await fetch('http://127.0.0.1:8787/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: String(payload),
    });
    return await r.text();
  } catch (e) {
    return JSON.stringify({ error: { code: -32603, message: 'bridge: ' + e.message } });
  }
});

const shim = readFileSync(new URL('./shim.js', import.meta.url), 'utf8');
await page.evaluateOnNewDocument(shim);
await page.goto(MINE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(7000);

const gpu = await page.evaluate(async () => {
  if (!navigator.gpu) return 'no navigator.gpu';
  const ad = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!ad) return 'no adapter';
  const inf = ad.info ?? {};
  return 'webgpu ok: ' + (inf.architecture || inf.description || inf.device || 'unknown');
});
console.log('[gpu]', gpu);

const text = async () => (await page.evaluate(() => document.body.innerText || '')).replace(/\n{2,}/g, '\n');
const clickByText = async (t, selector = 'button, a, [role=button]') =>
  page.evaluate((sel, tt) => {
    const norm = (s) => (s || '').trim().toLowerCase();
    const el = [...document.querySelectorAll(sel)].find((e) => norm(e.textContent).includes(norm(tt)) && e.offsetParent !== null);
    if (!el) return false;
    el.click();
    return true;
  }, selector, t);

async function connectWallet() {
  if (hasAddr(await text())) return true;
  const deepClick = (needle, exact) => page.evaluate((needle, exact) => {
    const all = [];
    const walk = (root) => {
      let nodes; try { nodes = root.querySelectorAll('*'); } catch (_) { return; }
      nodes.forEach((e) => { all.push(e); if (e.shadowRoot) walk(e.shadowRoot); });
    };
    walk(document);
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const re = exact ? new RegExp('^' + needle + '$', 'i') : new RegExp(needle, 'i');
    const cand = all.filter((e) => vis(e) && re.test((e.textContent || '').trim()) && (e.textContent || '').trim().length < 80);
    if (!cand.length) return false;
    const el = cand[0];
    ((el.closest && el.closest('button, [role=button], li, div[role=button]')) || el).click();
    return true;
  }, needle, exact);

  let opened = await deepClick('connect wallet', false);
  if (!opened) opened = await deepClick('connect', false);
  await sleep(2000);
  const clicked = await deepClick('metamask', true);
  console.log('metaMask entry clicked:', clicked);
  await sleep(4500);
  return hasAddr(await text());
}

async function startMiner() {
  await clickByText('gpu', 'button, [role=tab], label');
  await sleep(800);
  const started = (await clickByText('start mining')) || (await clickByText('mine a cat'));
  console.log('start clicked:', started);
  return started;
}

console.log('--- initial page ---');
console.log((await text()).slice(0, 300));

let connected = false;
for (let i = 0; i < 5 && !connected; i++) connected = await connectWallet();
console.log('wallet connected:', connected);

if (connected) await startMiner();
else console.log('WARN: wallet did not connect — miner will retry in the status loop');

setInterval(async () => {
  try {
    const t = await text();
    const get = (re) => (t.match(re) || [])[1];
    console.log(new Date().toISOString(), JSON.stringify({
      miner: get(/MINER\s+([A-Z ]+)/),
      speed: get(/SPEED\n([^\n]+)/),
      seen: get(/CATS SEEN\n([^\n]+)/),
      wait: get(/EXPECTED WAIT\n([^\n]+)/),
      target: get(/TARGET TO BEAT\n([^\n]+)/),
    }));
    if (!hasAddr(t)) {
      const c = await connectWallet();
      if (c) { console.log('reconnected; starting miner'); await startMiner(); }
    } else if (/MINER\s+IDLE/.test(t)) {
      const c = await startMiner();
      if (c) console.log('miner was idle; restarted');
    }
  } catch (e) { console.log('status err', e.message); }
}, 30000);
