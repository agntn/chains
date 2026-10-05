import { EVM } from "../core/chain.ts";

export class Gnosis extends EVM {
  static readonly key = "gnosis" as const;
  readonly name = "Gnosis Chain";
  readonly symbol = "xDAI";
  override readonly decimals = 18;
  readonly explorer = "https://gnosisscan.io";
  override readonly bip44 = 60;
  override readonly chainId = "0x64";
  override readonly caip2 = "eip155:100";
  override readonly rpcDefault = "https://gnosis-rpc.publicnode.com";
}
