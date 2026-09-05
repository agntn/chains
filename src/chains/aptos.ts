import { Move } from "../core/chain.js";

export class Aptos extends Move {
  static readonly key = "aptos" as const;
  readonly name = "Aptos";
  readonly symbol = "APT";
  override readonly decimals = 8;
  readonly explorer = "https://explorer.aptoslabs.com";
  readonly bip44 = 637;
  readonly caip2 = "aptos:mainnet";
}
