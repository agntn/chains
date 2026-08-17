import { Move } from "../core/chain.js";
import { register } from "../core/registry.js";

export class Aptos extends Move {
  static readonly key = "aptos" as const;
  readonly name = "Aptos";
  readonly symbol = "APT";
  readonly explorer = "https://explorer.aptoslabs.com";
  readonly bip44 = 637;
  readonly caip2 = "aptos:mainnet";
}

register(Aptos);
