import { EVM } from "../core/chain.js";

export class Gnosis extends EVM {
  static readonly key = "gnosis" as const;
  readonly name = "Gnosis Chain";
  readonly symbol = "xDAI";
  readonly explorer = "https://gnosisscan.io";
  readonly bip44 = 60;
  readonly chainId = "0x64";
  readonly caip2 = "eip155:100";
  readonly rpcDefault = "https://gnosis-rpc.publicnode.com";
}
