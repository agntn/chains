import { EVM } from "../core/chain.js";

export class Bsc extends EVM {
  static readonly key = "bsc" as const;
  readonly name = "BNB Chain";
  readonly symbol = "BNB";
  override readonly decimals = 18;
  readonly explorer = "https://bscscan.com";
  readonly bip44 = 60;
  readonly chainId = "0x38";
  readonly caip2 = "eip155:56";
  readonly rpcDefault = "https://bsc-rpc.publicnode.com";
}
