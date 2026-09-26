import { EVM } from "../core/chain.ts";

export class Polygon extends EVM {
  static readonly key = "polygon" as const;
  readonly name = "Polygon PoS";
  readonly symbol = "POL";
  override readonly decimals = 18;
  readonly explorer = "https://polygonscan.com";
  readonly bip44 = 60;
  readonly chainId = "0x89";
  readonly caip2 = "eip155:137";
  readonly rpcDefault = "https://polygon-bor-rpc.publicnode.com";
}
