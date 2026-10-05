import { EVM } from "../core/chain.ts";

export class Linea extends EVM {
  static readonly key = "linea" as const;
  readonly name = "Linea";
  readonly symbol = "ETH";
  override readonly decimals = 18;
  readonly explorer = "https://lineascan.build";
  override readonly bip44 = 60;
  override readonly chainId = "0xe708";
  override readonly caip2 = "eip155:59144";
  override readonly rpcDefault = "https://linea-rpc.publicnode.com";
}
