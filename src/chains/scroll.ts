import { EVM } from "../core/chain.js";

export class Scroll extends EVM {
  static readonly key = "scroll" as const;
  readonly name = "Scroll";
  readonly symbol = "ETH";
  readonly explorer = "https://scrollscan.com";
  readonly bip44 = 60;
  readonly chainId = "0x82750";
  readonly caip2 = "eip155:534352";
  readonly rpcDefault = "https://scroll-rpc.publicnode.com";
}
