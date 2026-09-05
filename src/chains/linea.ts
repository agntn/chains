import { EVM } from "../core/chain.js";

export class Linea extends EVM {
  static readonly key = "linea" as const;
  readonly name = "Linea";
  readonly symbol = "ETH";
  override readonly decimals = 18;
  readonly explorer = "https://lineascan.build";
  readonly bip44 = 60;
  readonly chainId = "0xe708";
  readonly caip2 = "eip155:59144";
  readonly rpcDefault = "https://linea-rpc.publicnode.com";
}
