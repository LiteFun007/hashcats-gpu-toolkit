// Extract the collection ABI JSON embedded in the site bundle.
import fs from 'node:fs';
const input = process.argv[2];
const output = process.argv[3] || 'abi.json';
if (!input) {
  console.error('usage: node tools/extract-abi.mjs <site-bundle.js> [out.json]');
  process.exit(1);
}
const src = fs.readFileSync(input, 'utf8');
const start = src.search(/\[\{"type":"(function|constructor|event)"/);
if (start < 0) throw new Error('ABI array start not found');
let i = start, depth = 0, inStr = false, esc = false;
for (; i < src.length; i++) {
  const c = src[i];
  if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
  if (c === '"') { inStr = true; continue; }
  if (c === '[' || c === '{') depth++;
  else if (c === ']' || c === '}') { depth--; if (depth === 0) { i++; break; } }
}
const abi = JSON.parse(src.slice(start, i));
fs.writeFileSync(output, JSON.stringify(abi, null, 1));
console.log('entries:', abi.length);
console.log('functions:', abi.filter((e) => e.type === 'function').map((e) => e.name).join(', '));
console.log('events:', abi.filter((e) => e.type === 'event').map((e) => e.name).join(', '));
