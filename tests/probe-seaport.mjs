// Verify our Seaport 1.6 assumptions against the deployed contract (read-only).
import { publicClient } from '../src/chain.mjs';
import { domainSeparatorLocally, seaportInfo, counterOf, SEAPORT_16 } from '../src/seaport.mjs';

const pc = publicClient();
const SELLER = process.env.SELLER;
if (!SELLER) { console.error('set SELLER=0x… (the wallet to inspect)'); process.exit(1); }

const [version, domainSeparator, conduitController] = await seaportInfo(pc);
const local = domainSeparatorLocally({ version });
const counter = await counterOf(pc, SELLER);

console.log(JSON.stringify({
  seaport: SEAPORT_16,
  version,
  conduitController,
  domainSeparatorOnChain: domainSeparator,
  domainSeparatorLocal: local,
  domainSeparatorMatch: domainSeparator === local,
  seller: SELLER,
  counter: counter.toString(),
}, null, 1));
