import { Chain } from "../core/chain.js";
import { register } from "../core/registry.js";

export class Ton extends Chain {
  static readonly key = "ton" as const;
  readonly type = "ton" as const;
  readonly name = "TON (The Open Network)";
  readonly symbol = "TON";
  readonly explorer = "https://tonscan.org";
  readonly bip44 = 607;
  readonly caip2 = "ton:-1";
}

register(Ton);
