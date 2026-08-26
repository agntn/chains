import { EVM } from "../core/chain.js";

export class ZkSync extends EVM {
  static readonly key = "zksync" as const;
  readonly name = "zkSync Era";
  readonly symbol = "ETH";
  readonly explorer = "https://explorer.zksync.io";
  readonly bip44 = 60;
  readonly chainId = "0x144";
  readonly caip2 = "eip155:324";
  readonly rpcDefault = "https://mainnet.era.zksync.io";
}
