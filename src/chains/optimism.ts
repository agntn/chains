import { EVM } from "../core/chain.js";

export class Optimism extends EVM {
  static readonly key = "optimism" as const;
  readonly name = "Optimism";
  readonly symbol = "ETH";
  readonly explorer = "https://optimistic.etherscan.io";
  readonly bip44 = 60;
  readonly chainId = "0xa";
  readonly caip2 = "eip155:10";
  readonly rpcDefault = "https://optimism-rpc.publicnode.com";
}
