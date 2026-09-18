import { EVM } from "../core/chain.js";

export class Arc extends EVM {
  static readonly key = "arc" as const;
  readonly name = "Arc";
  readonly symbol = "USDC";
  /** Native USDC counts 18 decimals; the ERC-20 view of the same balance shows 6. */
  override readonly decimals = 18;
  readonly explorer = "https://explorer.arc.io";
  readonly bip44 = 60;
  readonly chainId = "0x13b2";
  readonly caip2 = "eip155:5042";
  readonly rpcDefault = "https://rpc.mainnet.arc.io";
}
