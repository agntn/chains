import { EVM } from "../core/chain.js";
import { register } from "../core/registry.js";

export class Base extends EVM {
  static readonly key = "base" as const;
  readonly name = "Base";
  readonly symbol = "ETH";
  readonly explorer = "https://basescan.org";
  readonly bip44 = 60;
  readonly chainId = "0x2105";
  readonly caip2 = "eip155:8453";
  readonly rpcDefault = "https://base-rpc.publicnode.com";
}

register(Base);
