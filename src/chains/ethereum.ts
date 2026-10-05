import { EVM } from "../core/chain.ts";

export class Ethereum extends EVM {
  static readonly key = "ethereum" as const;
  readonly name = "Ethereum";
  readonly symbol = "ETH";
  override readonly decimals = 18;
  readonly explorer = "https://etherscan.io";
  override readonly bip44 = 60;
  override readonly chainId = "0x1";
  override readonly caip2 = "eip155:1";
  override readonly rpcDefault = "https://ethereum-rpc.publicnode.com";
}
