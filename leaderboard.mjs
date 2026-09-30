import { publicClient, readState } from './src/chain.mjs';
import { parseAbiItem } from 'viem';

const pc = publicClient();
const COLLECTION = '0xCA75DF55Cc9C476DB27a7375D1fc8E794cf80721';
const BURNER = (process.env.MINER_ADDR || '0x1e0b1A112CBc934897e6433149e6a5f88B65F018').toLowerCase();
const OUR_GH = Number(process.env.OUR_GH || '23.5');
const ZERO = '0x0000000000000000000000000000000000000000';
const ev = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)');
const bal = [{ name:'balanceOf', type:'function', stateMutability:'view', inputs:[{type:'address'}], outputs:[{type:'uint256'}] }];

const st = await readState(pc).catch(()=>({targetBits:48}));
const bits = st.targetBits || 48;
const H = 2 ** bits;

const latest = await pc.getBlock();
const curBN = latest.number, now = Number(latest.timestamp);
const s = await pc.getBlock({ blockNumber: curBN - 3000n });
const dt = Math.max(0.05, (now - Number(s.timestamp)) / 3000);   // sec/block
let perHour = BigInt(Math.min(40000, Math.ceil(3600 / dt)));
const fromBN = curBN > perHour ? curBN - perHour : 0n;
const t15 = now - 900, t60 = now - 3600;

let logs = [];
const step = 1500n;
for (let b = fromBN; b <= curBN; b += step + 1n) {
  const to = (b + step > curBN) ? curBN : b + step;
  try { logs = logs.concat(await pc.getLogs({ address: COLLECTION, event: ev, args: { from: ZERO }, fromBlock: b, toBlock: to })); }
  catch { for (let bb=b; bb<=to; bb+=300n){ const t2=(bb+300n>to)?to:bb+300n; try{logs=logs.concat(await pc.getLogs({address:COLLECTION,event:ev,args:{from:ZERO},fromBlock:bb,toBlock:t2}))}catch{} } }
}

const agg = {};
for (const l of logs) {
  const to = l.args.to.toLowerCase();
  const ts = now - Number(curBN - l.blockNumber) * dt;
  (agg[to] ||= { c60:0, c15:0, last:0 });
  if (ts >= t60) agg[to].c60++;
  if (ts >= t15) agg[to].c15++;
  if (ts > agg[to].last) agg[to].last = ts;
}
let rows = Object.entries(agg).map(([a,v]) => ({ a, ...v, gh: v.c60 * H / 3600 / 1e9 }));
const netGH = rows.reduce((s,r)=>s+r.gh,0) + (agg[BURNER]?0:OUR_GH);
rows.sort((x,y)=>y.c60-x.c60);
const top = rows.slice(0,12);

// balances (всього owned) for shown addrs + burner
const addrs = [...new Set([...top.map(r=>r.a), BURNER])];
const bals = {};
await Promise.all(addrs.map(async a=>{ try{ bals[a]=Number(await pc.readContract({address:COLLECTION,abi:bal,functionName:'balanceOf',args:[a]})) }catch{ bals[a]='?' } }));

const hhmm = ts => ts? new Date(ts*1000).toISOString().slice(11,16) : '—';
const short = a => a.slice(0,6)+'…'+a.slice(-4);
const pad = (s,n)=>String(s).padEnd(n); const pads=(s,n)=>String(s).padStart(n);

console.log(`\nHASHCATS майнинг-лидерборд · сложность ${bits} бит · сеть ≈${(netGH/1000).toFixed(1)} TH/s · блок ${curBN}\n`);
console.log(pad('адрес',16), pads('всего',7), pads('60 мин',7), pads('15 мин',7), pads('≈GH/s',8), pads('доля сети',10), '  последний минт');
console.log('-'.repeat(76));
for (const r of top) {
  console.log(pad(short(r.a),16), pads(bals[r.a],7), pads(r.c60,7), pads(r.c15,7),
    pads(Math.round(r.gh),8), pads((r.gh/netGH*100).toFixed(1)+'%',10), '  '+hhmm(r.last));
}
console.log('-'.repeat(76));
const me = agg[BURNER];
const myGh = me? me.gh : OUR_GH;
console.log(pad('ты '+short(BURNER),16), pads(bals[BURNER],7), pads(me?me.c60:'—',7), pads(me?me.c15:'—',7),
  pads(Math.round(myGh),8), pads((myGh/netGH*100).toFixed(2)+'%',10), '  '+(me?hhmm(me.last):'—'));
console.log('');
