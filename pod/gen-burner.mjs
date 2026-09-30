// Generates a burner private key + address for pod mining.
// The key is written to ./burner.key (0600) — never printed.
// Usage: node gen-burner.mjs
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { writeFileSync, existsSync } from 'node:fs';

const file = new URL('./burner.key', import.meta.url).pathname;
if (existsSync(file)) {
  console.error('burner.key already exists — refusing to overwrite');
  process.exit(1);
}
const pk = generatePrivateKey(); // 0x + 64 hex
writeFileSync(file, pk + '\n', { mode: 0o600 });
console.log('burner address:', privateKeyToAccount(pk).address);
console.log('key saved to:', file, '(chmod 600, contents not printed)');
