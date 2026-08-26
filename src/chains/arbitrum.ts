import { EVM } from "../core/chain.js";

export class Arbitrum extends EVM {
  static readonly key = "arbitrum" as const;
  readonly name = "Arbitrum One";
  readonly symbol = "ETH";
  readonly explorer = "https://arbiscan.io";
  readonly bip44 = 60;
  readonly chainId = "0xa4b1";
  readonly caip2 = "eip155:42161";
  readonly rpcDefault = "https://arbitrum-one-rpc.publicnode.com";
}
