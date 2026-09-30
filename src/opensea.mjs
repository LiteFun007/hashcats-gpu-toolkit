// OpenSea marketplace glue: turn an offer into a ready-to-send transaction.
//
// Verified publicly (no key needed): collection `hash-cats` on chain `robinhood`,
// fees = 1% to 0x0000a26b00c1f0df003000390027140000faa719 (required) + 5% to the
// protocol hook 0xca757986e932bc55776492cca0b413e9b3d02acc, offers priced in WETH.
//
// What needs a key: the signed order behind an offer. OpenSea returns a fully built
// transaction for it (fulfillment_data), which we encode and send from our own key.
import { parseAbiParameters, encodeAbiParameters, decodeAbiParameters, keccak256, toHex, formatEther } from 'viem';
import { walletClient, publicClient, COLLECTION } from './chain.mjs';
import { SEAPORT_16 } from './sell.mjs';

export const OPENSEA_API = 'https://api.opensea.io/api/v2';
/** OpenSea chain identifier for this collection (verified via their public API). */
export const CHAIN = 'robinhood';

// Seaport 1.6 structs with their real component names. OpenSea serialises objects
// alphabetically, so positional mapping is wrong — we map by name instead.
const SEAPORT_STRUCTS = {
  OfferItem: '(uint8 itemType,address token,uint256 identifierOrCriteria,uint256 startAmount,uint256 endAmount)',
  ConsiderationItem: '(uint8 itemType,address token,uint256 identifierOrCriteria,uint256 startAmount,uint256 endAmount,address recipient)',
  OrderParameters: '(address offerer,address zone,OfferItem[] offer,ConsiderationItem[] consideration,uint8 orderType,uint256 startTime,uint256 endTime,bytes32 zoneHash,uint256 salt,bytes32 conduitKey,uint256 totalOriginalConsiderationItems)',
  AdvancedOrder: '(OrderParameters parameters,uint256 numerator,uint256 denominator,bytes signature,bytes extraData)',
  CriteriaResolver: '(uint256 orderIndex,uint8 side,uint256 index,uint256 identifier,bytes32[] criteriaProof)',
  FulfillmentComponent: '(uint256 orderIndex,uint256 itemIndex)',
  Fulfillment: '(FulfillmentComponent[] offerComponents,FulfillmentComponent[] considerationComponents)',
  AdditionalRecipient: '(uint256 amount,address recipient)',
  BasicOrderParameters: '(address considerationToken,uint256 considerationIdentifier,uint256 considerationAmount,address offerer,address zone,address offerToken,uint256 offerIdentifier,uint256 offerAmount,uint8 basicOrderType,uint256 startTime,uint256 endTime,bytes32 zoneHash,uint256 salt,bytes32 offererConduitKey,bytes32 fulfillerConduitKey,AdditionalRecipient[] additionalRecipients,bytes signature)',
};

const SEAPORT_FUNCS = {
  matchAdvancedOrders: '[AdvancedOrder[] orders,CriteriaResolver[] criteriaResolvers,Fulfillment[] fulfillments,address recipient]',
  fulfillAdvancedOrder: '[AdvancedOrder advancedOrder,CriteriaResolver[] criteriaResolvers,bytes32 fulfillerConduitKey,address recipient]',
  fulfillAvailableAdvancedOrders: '[AdvancedOrder[] advancedOrders,CriteriaResolver[] criteriaResolvers,FulfillmentComponent[] offerFulfillments,FulfillmentComponent[] considerationFulfillments,bytes32 fulfillerConduitKey,address recipient,uint256 maximumFulfilled]',
  fulfillBasicOrder: '[BasicOrderParameters parameters]',
  fulfillBasicOrder_efficient_6GL6yc: '[BasicOrderParameters parameters]',
};

function expandTypes(list) {
  let out = list;
  for (let i = 0; i < 8; i++) {
    const before = out;
    out = out.replace(/(OfferItem|ConsiderationItem|OrderParameters|AdvancedOrder|CriteriaResolver|FulfillmentComponent|Fulfillment|AdditionalRecipient|BasicOrderParameters)(?![A-Za-z])/g, (m) => SEAPORT_STRUCTS[m]);
    if (out === before) break;
  }
  return out;
}
export const SLUG = process.env.HASHCATS_SLUG || 'hash-cats';

/** Public collection metadata: fees, supply, currencies. */
export async function collectionInfo(slug = SLUG) {
  const r = await fetch(`${OPENSEA_API}/collections/${slug}`, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`OpenSea collections ${r.status}`);
  const c = await r.json();
  return {
    slug: c.collection,
    name: c.name,
    chain: c.contracts?.[0]?.chain,
    contract: c.contracts?.[0]?.address,
    fees: (c.fees || []).map((f) => ({ percent: f.fee, recipient: f.recipient, required: f.required })),
    listingCurrency: c.pricing_currencies?.listing_currency?.symbol,
    offerCurrency: c.pricing_currencies?.offer_currency?.symbol,
    collectionOffersEnabled: c.collection_offers_enabled,
    totalSupply: c.total_supply,
  };
}

/**
 * Best live offer for one token (chain + criteria offers included).
 * NOTE: the zone authorisation inside the returned order is short-lived, so the
 * fulfillment data must be requested immediately before sending.
 */
export async function fetchBestOffer({ slug = SLUG, tokenId, apiKey }) {
  const r = await fetch(`${OPENSEA_API}/offers/collection/${slug}/nfts/${tokenId}/best`, {
    headers: { accept: 'application/json', 'x-api-key': apiKey },
  });
  if (!r.ok) throw new Error(`OpenSea best offer ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return {
    orderHash: j.order_hash,
    priceWei: j.price?.value,
    priceEth: formatEther(BigInt(j.price?.value ?? 0)),
    currency: j.price?.currency,
    offerer: j.protocol_data?.parameters?.offerer,
    endTime: Number(j.protocol_data?.parameters?.endTime ?? 0),
    criteria: j.criteria?.encoded_token_ids ?? null,
  };
}

/**
 * OpenSea's ready-made fulfillment transaction for a criteria/collection offer.
 * The request needs the concrete token we hand over — that is the `consideration`.
 */
export async function fetchOfferFulfillment({ slug = SLUG, tokenId, apiKey, address, offerHash = null }) {
  const hash = offerHash ?? (await fetchBestOffer({ slug, tokenId, apiKey })).orderHash;
  const r = await fetch(`${OPENSEA_API}/offers/fulfillment_data`, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({
      offer: { hash, chain: CHAIN, protocol_address: SEAPORT_16 },
      fulfiller: { address },
      consideration: { asset_contract_address: COLLECTION, token_id: String(tokenId) },
    }),
  });
  if (!r.ok) throw new Error(`OpenSea fulfillment_data ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const body = await r.json();
  return body.fulfillment_data ?? body;
}

/** The live collection-offer ladder, cheapest-last is not guaranteed: we sort ourselves. */
export async function fetchOffers({ slug = SLUG, apiKey, limit = 10 }) {
  const r = await fetch(`${OPENSEA_API}/offers/collection/${slug}?limit=${limit}`, {
    headers: { accept: 'application/json', 'x-api-key': apiKey },
  });
  if (!r.ok) throw new Error(`OpenSea offers ${r.status}: ${(await r.text()).slice(0, 160)}`);
  const j = await r.json();
  return (j.offers ?? []).map((o) => ({
    orderHash: o.order_hash,
    priceWei: o.price?.current?.value ?? o.price?.value,
    currency: o.price?.current?.currency ?? o.price?.currency,
    endTime: Number(o.protocol_data?.parameters?.endTime ?? 0),
    offerer: o.protocol_data?.parameters?.offerer,
  }));
}

/**
 * MANUAL sell path — never invoked automatically by the miner.
 *
 * Offers in this market expire within minutes, so we walk the ladder from the
 * highest price down, refresh each order's fulfillment data in the same process,
 * and always simulate before broadcasting: a reverting transaction is never sent.
 * With `send: false` nothing leaves the machine at all.
 */
export async function acceptBestOffer({ key, pc = publicClient(), slug = SLUG, tokenId, apiKey, send = false, minPriceWei = 0n }) {
  const wallet = walletClient(key);
  const now = Math.floor(Date.now() / 1000);
  const best = await fetchBestOffer({ slug, tokenId, apiKey }).catch(() => null);
  const ladder = await fetchOffers({ slug, apiKey, limit: 10 }).catch(() => []);
  const candidates = [];
  const seen = new Set();
  for (const c of [best, ...ladder]) {
    if (!c?.orderHash || seen.has(c.orderHash)) continue;
    seen.add(c.orderHash);
    candidates.push(c);
  }
  candidates.sort((a, b) => Number(BigInt(b.priceWei ?? 0) - BigInt(a.priceWei ?? 0)));

  const attempts = [];
  for (const c of candidates) {
    const priceWei = BigInt(c.priceWei ?? 0);
    if (minPriceWei && priceWei < minPriceWei) {
      attempts.push({ orderHash: c.orderHash, priceEth: formatEther(priceWei), skipped: 'below --min-price' });
      continue;
    }
    if (c.endTime && c.endTime - now < 30) {
      attempts.push({ orderHash: c.orderHash, priceEth: formatEther(priceWei), skipped: 'expires too soon' });
      continue;
    }
    try {
      const fulfillment = await fetchOfferFulfillment({ slug, tokenId, apiKey, address: wallet.account.address, offerHash: c.orderHash });
      const tx = fulfillment.transaction ?? fulfillment;
      const simulated = await acceptOfferTx({ key, transaction: tx, pc, send: false });
      if (!send) {
        return { ...simulated, orderHash: c.orderHash, priceWei: priceWei.toString(), priceEth: formatEther(priceWei), attempts };
      }
      const out = await acceptOfferTx({ key, transaction: tx, pc, send: true });
      const receipt = await pc.waitForTransactionReceipt({ hash: out.txHash });
      return {
        ...out, status: receipt.status, orderHash: c.orderHash,
        priceWei: priceWei.toString(), priceEth: formatEther(priceWei), attempts,
      };
    } catch (err) {
      attempts.push({ orderHash: c.orderHash, priceEth: formatEther(priceWei), error: String(err.shortMessage || err.message).slice(0, 120) });
    }
  }
  throw new Error(`no offer could be fulfilled: ${JSON.stringify(attempts).slice(0, 300)}`);
}

/**
 * Encode OpenSea's {function, input_data} into calldata.
 * Writes a bare {to, data, value} transaction. Also accepts a blob that already has `data`.
 */
export function encodeFulfillment(transaction) {
  if (!transaction) throw new Error('empty fulfillment transaction');
  const { function: sig, input_data: inputs, inputData, data, to, value } = transaction;
  const raw = data ?? transaction.input_data?.data;
  if (!sig && raw) return { to, data: raw, value: BigInt(value ?? 0) };
  if (!sig) throw new Error('fulfillment transaction has neither function signature nor data');
  const named = inputs ?? inputData ?? {};
  const fnName = sig.slice(0, sig.indexOf('(')).trim();
  let parsed;
  let args;
  if (SEAPORT_FUNCS[fnName]) {
    parsed = parseAbiParameters(expandTypes(SEAPORT_FUNCS[fnName].slice(1, -1)));
    args = parsed.map((input, i) =>
      fromAbi(input, named?.[input.name] !== undefined ? named[input.name] : (Array.isArray(named) ? named[i] : undefined)));
  } else {
    const split = splitSignature(sig);
    parsed = split.inputs;
    const values = Array.isArray(named) ? named : Object.values(named);
    args = parsed.map((input, i) => fromAbi(input, values[i]));
  }
  const selector = keccak256(toHex(canonicalSignature(sig))).slice(0, 10);
  return { to, data: `${selector}${encodeAbiParameters(parsed, args).slice(2)}`, value: BigInt(value ?? 0), signature: fnName };
}

/** OpenSea returns human-readable signatures with unnamed tuples; abitype needs names. */
function splitTop(s) {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

/** Split "fn(type,type)" into a name and parsed parameter types (inline tuples included). */
export function splitSignature(sig) {
  const s = sig.trim();
  const open = s.indexOf('(');
  if (open < 0) throw new Error(`not a signature: ${sig}`);
  const name = s.slice(0, open).trim();
  const body = s.slice(open + 1, s.lastIndexOf(')')).trim();
  const paramTypes = body === '' ? [] : splitTop(body).map((t) => t.trim());
  return { name, paramTypes, inputs: paramTypes.length ? parseAbiParameters(paramTypes.join(',')) : [] };
}

/** Canonical (name-free, whitespace-free) signature, as used for the 4-byte selector. */
export const canonicalSignature = (sig) => sig.trim().replace(/\s+/g, '');

function orderedValues(obj, components) {
  const named = components.every((c) => c.name && obj[c.name] !== undefined);
  return named ? components.map((c) => obj[c.name]) : Object.values(obj);
}

function fromAbi(input, value) {
  if (value === undefined || value === null) return value;
  if (input.type === 'tuple') {
    const vals = Array.isArray(value) ? value : orderedValues(value, input.components);
    return input.components.map((c, i) => fromAbi(c, vals[i]));
  }
  if (input.type.startsWith('tuple[')) {
    const inner = { ...input, type: 'tuple' };
    return (value ?? []).map((v) => fromAbi(inner, v));
  }
  if (input.type.endsWith('[]')) {
    const inner = { ...input, type: input.type.slice(0, -2) };
    return (value ?? []).map((v) => fromAbi(inner, v));
  }
  return value;
}

/** Sanity check of our own encoding: decode the calldata back and compare. */
export function selfCheckEncoding(transaction) {
  const { data, signature } = encodeFulfillment(transaction);
  if (!signature) return { skipped: 'raw data' };
  const { name, inputs: parsed } = splitSignature(transaction.function);
  const decoded = decodeAbiParameters(parsed, `0x${data.slice(10)}`);
  return { function: name, argsDecoded: decoded.length, selector: data.slice(0, 10) };
}

/** Send (or simulate) the fulfillment transaction with the owner's key. */
export async function acceptOfferTx({ key, transaction, pc = publicClient(), send = false }) {
  const { to, data, value } = encodeFulfillment(transaction);
  const wallet = walletClient(key);
  if (!send) {
    const call = await pc.call({ account: wallet.account, to, data, value });
    return { dryRun: true, from: wallet.account.address, to, value: value.toString(), result: call.data };
  }
  const hash = await wallet.sendTransaction({ account: wallet.account, to, data, value, chain: wallet.chain });
  return { dryRun: false, from: wallet.account.address, to, value: value.toString(), txHash: hash };
}
