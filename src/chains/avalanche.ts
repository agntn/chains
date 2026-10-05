import { EVM } from "../core/chain.ts";

export class Avalanche extends EVM {
  static readonly key = "avalanche" as const;
  readonly name = "Avalanche C-Chain";
  readonly symbol = "AVAX";
  override readonly decimals = 18;
  readonly explorer = "https://snowtrace.io";
  override readonly bip44 = 60;
  override readonly chainId = "0xa86a";
  override readonly caip2 = "eip155:43114";
  override readonly rpcDefault = "https://avalanche-c-chain-rpc.publicnode.com";
}
