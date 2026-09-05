import { EVM } from "../core/chain.js";

export class Avalanche extends EVM {
  static readonly key = "avalanche" as const;
  readonly name = "Avalanche C-Chain";
  readonly symbol = "AVAX";
  override readonly decimals = 18;
  readonly explorer = "https://snowtrace.io";
  readonly bip44 = 60;
  readonly chainId = "0xa86a";
  readonly caip2 = "eip155:43114";
  readonly rpcDefault = "https://avalanche-c-chain-rpc.publicnode.com";
}
