// Seaport 1.6 on Robinhood Chain — verified surface only.
//
// We deliberately do NOT build or sign orders ourselves. OpenSea returns a
// ready-made fulfillment transaction for a live offer (see src/opensea.mjs), and
// reproducing Seaport 1.6's EIP-712 order hash locally did not match the deployed
// contract — so a self-signed listing would be untrustworthy. Selling therefore
// always rides on OpenSea's own order data.
//
// What is verified here (tests/probe-seaport.mjs, read-only):
//   * Seaport 1.6 is deployed and reports version "1.6"
//   * our locally computed EIP-712 domain separator equals the contract's
//     information() domain separator byte for byte
//   * the offerer's counter is readable, and any order hash can be queried
import { parseAbi, keccak256, encodeAbiParameters, toHex } from 'viem';
import { CHAIN_ID } from './chain.mjs';

export const SEAPORT_16 = '0x0000000000000068F116a894984e2DB1123eB395';

export const SEAPORT_ABI = parseAbi([
  'function information() view returns (string version, bytes32 domainSeparator, address conduitController)',
  'function getCounter(address offerer) view returns (uint256)',
  'function getOrderStatus(bytes32 orderHash) view returns (bool isValidated, bool isCancelled, uint256 totalFilled, uint256 totalSize)',
]);

export const seaportDomain = ({ name = 'Seaport', version = '1.6', chainId = CHAIN_ID, verifyingContract = SEAPORT_16 } = {}) => ({
  name,
  version,
  chainId,
  verifyingContract,
});

/** EIP-712 domain separator, built the way the contract builds it. */
export const domainSeparatorLocally = ({ name = 'Seaport', version = '1.6', chainId = CHAIN_ID, verifyingContract = SEAPORT_16 } = {}) =>
  keccak256(
    encodeAbiParameters(
      [{ type: 'bytes32' }, { type: 'bytes32' }, { type: 'bytes32' }, { type: 'uint256' }, { type: 'address' }],
      [
        keccak256(toHex('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')),
        keccak256(toHex(name)),
        keccak256(toHex(version)),
        BigInt(chainId),
        verifyingContract,
      ],
    ),
  );

export const counterOf = (pc, offerer) =>
  pc.readContract({ address: SEAPORT_16, abi: SEAPORT_ABI, functionName: 'getCounter', args: [offerer] });

export const orderStatus = (pc, orderHash) =>
  pc.readContract({ address: SEAPORT_16, abi: SEAPORT_ABI, functionName: 'getOrderStatus', args: [orderHash] });

export const seaportInfo = (pc) =>
  pc.readContract({ address: SEAPORT_16, abi: SEAPORT_ABI, functionName: 'information' });
