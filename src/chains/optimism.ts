import { EVM } from "../core/chain.ts";

export class Optimism extends EVM {
  static readonly key = "optimism" as const;
  readonly name = "Optimism";
  readonly symbol = "ETH";
  override readonly decimals = 18;
  readonly explorer = "https://optimistic.etherscan.io";
  override readonly bip44 = 60;
  override readonly chainId = "0xa";
  override readonly caip2 = "eip155:10";
  override readonly rpcDefault = "https://optimism-rpc.publicnode.com";
}
