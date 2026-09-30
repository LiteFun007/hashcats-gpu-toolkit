// scan.mjs <file> <regex>... — print context around matches (bundle is minified: one giant line).
import fs from 'node:fs';
const file = process.argv[2];
const pats = process.argv.slice(3);
const src = fs.readFileSync(file, 'utf8');
for (const p of pats) {
  const re = new RegExp(p, 'g');
  let m, n = 0;
  console.log(`\n===== /${p}/ =====`);
  while ((m = re.exec(src)) !== null && n < 8) {
    const s = Math.max(0, m.index - 250);
    const e = Math.min(src.length, m.index + 600);
    console.log(`--- @${m.index}`);
    console.log(src.slice(s, e).replace(/\s+/g, ' '));
    n++;
  }
  if (n === 0) console.log('(no match)');
}
