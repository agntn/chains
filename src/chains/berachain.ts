import { EVM } from "../core/chain.ts";

export class Berachain extends EVM {
  static readonly key = "berachain" as const;
  readonly name = "Berachain";
  readonly symbol = "BERA";
  override readonly decimals = 18;
  readonly explorer = "https://berascan.com";
  override readonly bip44 = 60;
  override readonly chainId = "0x138de";
  override readonly caip2 = "eip155:80094";
  override readonly rpcDefault = "https://rpc.berachain.com";
}
