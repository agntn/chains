/**
 * chains — Public API
 */

export type { Chain, ChainInfo, ChainType } from "./types.js";
export {
  CHAIN_DATA,
  CHAIN_ALIASES,
  normalizeChain,
  // inter-lib bridges
  blocexChain,
  rpcxChain,
  ubichainChain,
  webriChain,
  tokriskChain,
  chainpexChain,
  // type guards
  isEvm,
  isSolana,
  isUtxo,
  isMove,
  isTon,
  isTron,
  isOctra,
  // address validation
  assertEvmAddress,
  assertSolanaAddress,
  assertBitcoinAddress,
  assertOctraAddress,
} from "./data.js";
export { version } from "./version.js";
