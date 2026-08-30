import { decodeBase58 } from "../core/base58.js";
import { Chain } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";

// Same BIP-173 charset and casing rules as Bitcoin, under Litecoin's `ltc` prefix.
const BECH32_ADDRESS =
  /^(ltc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{39,59}|LTC1[QPZRY9X8GF2TVDW0S3JN54KHCE6MUA7L]{39,59})$/;

export class Litecoin extends Chain {
  static readonly key = "litecoin" as const;
  readonly type = "utxo" as const;
  readonly name = "Litecoin";
  readonly symbol = "LTC";
  readonly explorer = "https://litecoinspace.org";
  readonly bip44 = 2;
  readonly caip2 = "bip122:12a765e31ffd4059bada1e25190f6e98";

  /**
   * Base58Check with Litecoin's version bytes: 0x30 pay-to-pubkey-hash (`L...`)
   * and 0x32 pay-to-script-hash (`M...`), a 20-byte hash and a 4-byte checksum,
   * 25 bytes in all. The deprecated 0x05 script-hash version stays out: it is
   * byte-identical to a Bitcoin `3...` address, so accepting it would make every
   * such address identify as both chains. The checksum stays unchecked: this is
   * a format check.
   *
   * @param {string} address - Candidate Litecoin address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const decoded = decodeBase58(address, 35);
    const legacy = decoded?.length === 25 && (decoded[0] === 0x30 || decoded[0] === 0x32);
    if (!legacy && !BECH32_ADDRESS.test(address)) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }
}
