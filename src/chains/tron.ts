import { Chain } from "../core/chain.js";
import { register } from "../core/registry.js";

export class Tron extends Chain {
  static readonly key = "tron" as const;
  readonly type = "tron" as const;
  readonly name = "TRON";
  readonly symbol = "TRX";
  readonly explorer = "https://tronscan.org";
  readonly bip44 = 195;
  readonly caip2 = "tron:0x2b6653dc";
}

register(Tron);
