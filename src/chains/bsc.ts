import { EVM } from "../core/chain.ts";

export class Bsc extends EVM {
  static readonly key = "bsc" as const;
  readonly name = "BNB Chain";
  readonly symbol = "BNB";
  override readonly decimals = 18;
  readonly explorer = "https://bscscan.com";
  override readonly bip44 = 60;
  override readonly chainId = "0x38";
  override readonly caip2 = "eip155:56";
  override readonly rpcDefault = "https://bsc-rpc.publicnode.com";
}
