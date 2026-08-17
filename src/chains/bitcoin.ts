import { Chain } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";
import { register } from "../core/registry.js";

const BASE58_ADDRESS = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;

// BIP-173 charset, which drops 1, b, i and o so they cannot be misread. An address
// is all-lowercase or all-uppercase — uppercase is what QR encoders emit — and mixed
// case is invalid, so the two cases are separate alternatives rather than a flag.
const BECH32_ADDRESS =
  /^(bc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{39,59}|BC1[QPZRY9X8GF2TVDW0S3JN54KHCE6MUA7L]{39,59})$/;

export class Bitcoin extends Chain {
  static readonly key = "bitcoin" as const;
  readonly type = "utxo" as const;
  readonly name = "Bitcoin";
  readonly symbol = "BTC";
  readonly explorer = "https://blockstream.info";
  readonly bip44 = 0;
  readonly caip2 = "bip122:000000000019d6689c085ae165831e93";

  override assertAddress(address: string): string {
    if (!BASE58_ADDRESS.test(address) && !BECH32_ADDRESS.test(address)) {
      throw new InvalidAddressError("Bitcoin", address);
    }
    return address;
  }
}

register(Bitcoin);
