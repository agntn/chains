import { EVM } from "../core/chain.ts";

export class Base extends EVM {
  static readonly key = "base" as const;
  readonly name = "Base";
  readonly symbol = "ETH";
  override readonly decimals = 18;
  readonly explorer = "https://basescan.org";
  override readonly bip44 = 60;
  override readonly chainId = "0x2105";
  override readonly caip2 = "eip155:8453";
  override readonly rpcDefault = "https://base-rpc.publicnode.com";
}
