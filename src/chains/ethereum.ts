import { EVM } from "../core/chain.js";

export class Ethereum extends EVM {
  static readonly key = "ethereum" as const;
  readonly name = "Ethereum";
  readonly symbol = "ETH";
  override readonly decimals = 18;
  readonly explorer = "https://etherscan.io";
  readonly bip44 = 60;
  readonly chainId = "0x1";
  readonly caip2 = "eip155:1";
  readonly rpcDefault = "https://ethereum-rpc.publicnode.com";
}
