import { EVM } from "../core/chain.js";
import { register } from "../core/registry.js";

export class Polygon extends EVM {
  static readonly key = "polygon" as const;
  readonly name = "Polygon PoS";
  readonly symbol = "POL";
  readonly explorer = "https://polygonscan.com";
  readonly bip44 = 60;
  readonly chainId = "0x89";
  readonly caip2 = "eip155:137";
  readonly rpcDefault = "https://polygon-bor-rpc.publicnode.com";
}

register(Polygon);
