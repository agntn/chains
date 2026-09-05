import { EVM } from "../core/chain.js";

export class Berachain extends EVM {
  static readonly key = "berachain" as const;
  readonly name = "Berachain";
  readonly symbol = "BERA";
  override readonly decimals = 18;
  readonly explorer = "https://berascan.com";
  readonly bip44 = 60;
  readonly chainId = "0x138de";
  readonly caip2 = "eip155:80094";
  readonly rpcDefault = "https://rpc.berachain.com";
}
