import { EVM } from "../core/chain.js";
import { register } from "../core/registry.js";

export class Fantom extends EVM {
  static readonly key = "fantom" as const;
  readonly name = "Fantom Opera";
  readonly symbol = "FTM";
  readonly explorer = "https://ftmscan.com";
  readonly bip44 = 60;
  readonly chainId = "0xfa";
  readonly caip2 = "eip155:250";
  readonly rpcDefault = "https://fantom-rpc.publicnode.com";
}

register(Fantom);
