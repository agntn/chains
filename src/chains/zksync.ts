import { EVM } from "../core/chain.ts";

export class ZkSync extends EVM {
  static readonly key = "zksync" as const;
  readonly name = "zkSync Era";
  readonly symbol = "ETH";
  override readonly decimals = 18;
  readonly explorer = "https://explorer.zksync.io";
  override readonly bip44 = 60;
  override readonly chainId = "0x144";
  override readonly caip2 = "eip155:324";
  override readonly rpcDefault = "https://mainnet.era.zksync.io";
}
