import type { ChainConstructor } from "../core/chain.js";
import { Aptos } from "./aptos.js";
import { Arbitrum } from "./arbitrum.js";
import { Avalanche } from "./avalanche.js";
import { Base } from "./base.js";
import { Berachain } from "./berachain.js";
import { Bitcoin } from "./bitcoin.js";
import { Bsc } from "./bsc.js";
import { Cardano } from "./cardano.js";
import { Ethereum } from "./ethereum.js";
import { Fantom } from "./fantom.js";
import { Gnosis } from "./gnosis.js";
import { Linea } from "./linea.js";
import { Litecoin } from "./litecoin.js";
import { Octra } from "./octra.js";
import { Optimism } from "./optimism.js";
import { Polygon } from "./polygon.js";
import { Scroll } from "./scroll.js";
import { Solana } from "./solana.js";
import { Sui } from "./sui.js";
import { Ton } from "./ton.js";
import { Tron } from "./tron.js";
import { ZkSync } from "./zksync.js";

/** Every chain the package ships. Not in this list, not in the registry. */
export const builtins: readonly ChainConstructor[] = [
  Ethereum,
  Base,
  Arbitrum,
  Optimism,
  Polygon,
  Bsc,
  Avalanche,
  Fantom,
  Gnosis,
  Linea,
  ZkSync,
  Scroll,
  Berachain,
  Bitcoin,
  Litecoin,
  Cardano,
  Solana,
  Aptos,
  Sui,
  Ton,
  Tron,
  Octra,
];
