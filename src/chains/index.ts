import type { ChainConstructor } from "../core/chain.ts";
import { Aptos } from "./aptos.ts";
import { Arbitrum } from "./arbitrum.ts";
import { Arc } from "./arc.ts";
import { Arweave } from "./arweave.ts";
import { Avalanche } from "./avalanche.ts";
import { Base } from "./base.ts";
import { Berachain } from "./berachain.ts";
import { Bitcoin } from "./bitcoin.ts";
import { BitcoinCash } from "./bitcoincash.ts";
import { BitcoinGold } from "./bitcoingold.ts";
import { BitcoinSv } from "./bitcoinsv.ts";
import { Bsc } from "./bsc.ts";
import { Cardano } from "./cardano.ts";
import { Dash } from "./dash.ts";
import { Decred } from "./decred.ts";
import { Dogecoin } from "./dogecoin.ts";
import { Ecash } from "./ecash.ts";
import { Ethereum } from "./ethereum.ts";
import { Fantom } from "./fantom.ts";
import { Gnosis } from "./gnosis.ts";
import { Linea } from "./linea.ts";
import { Litecoin } from "./litecoin.ts";
import { Monero } from "./monero.ts";
import { Octra } from "./octra.ts";
import { Optimism } from "./optimism.ts";
import { Pepecoin } from "./pepecoin.ts";
import { Polygon } from "./polygon.ts";
import { Scroll } from "./scroll.ts";
import { Solana } from "./solana.ts";
import { Stellar } from "./stellar.ts";
import { Sui } from "./sui.ts";
import { Ton } from "./ton.ts";
import { Tron } from "./tron.ts";
import { Xrpl } from "./xrpl.ts";
import { Zcash } from "./zcash.ts";
import { ZkSync } from "./zksync.ts";

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
  Pepecoin,
  Ecash,
  Cardano,
  Solana,
  Stellar,
  Xrpl,
  Aptos,
  Sui,
  Ton,
  Tron,
  Octra,
  Arweave,
  Monero,
  Decred,
  Arc,
  Dogecoin,
  BitcoinCash,
  BitcoinSv,
  BitcoinGold,
  Dash,
  Zcash,
];
