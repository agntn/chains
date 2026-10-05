import { EVM } from "../core/chain.ts";

export class Scroll extends EVM {
  static readonly key = "scroll" as const;
  readonly name = "Scroll";
  readonly symbol = "ETH";
  override readonly decimals = 18;
  readonly explorer = "https://scrollscan.com";
  override readonly bip44 = 60;
  override readonly chainId = "0x82750";
  override readonly caip2 = "eip155:534352";
  override readonly rpcDefault = "https://scroll-rpc.publicnode.com";
}
