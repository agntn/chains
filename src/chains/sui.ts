import { Move } from "../core/chain.js";

export class Sui extends Move {
  static readonly key = "sui" as const;
  readonly name = "Sui";
  readonly symbol = "SUI";
  readonly explorer = "https://suiscan.xyz";
  readonly bip44 = 784;
  readonly caip2 = "sui:mainnet";
}
