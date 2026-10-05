import { EVM } from "../core/chain.ts";

export class Fantom extends EVM {
  static readonly key = "fantom" as const;
  readonly name = "Fantom Opera";
  readonly symbol = "FTM";
  override readonly decimals = 18;
  readonly explorer = "https://ftmscan.com";
  override readonly bip44 = 60;
  override readonly chainId = "0xfa";
  override readonly caip2 = "eip155:250";
  override readonly rpcDefault = "https://rpc.fantom.network";
}
