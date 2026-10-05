import { EVM } from "../core/chain.ts";

export class Arbitrum extends EVM {
  static readonly key = "arbitrum" as const;
  readonly name = "Arbitrum One";
  readonly symbol = "ETH";
  override readonly decimals = 18;
  readonly explorer = "https://arbiscan.io";
  override readonly bip44 = 60;
  override readonly chainId = "0xa4b1";
  override readonly caip2 = "eip155:42161";
  override readonly rpcDefault = "https://arbitrum-one-rpc.publicnode.com";
}
