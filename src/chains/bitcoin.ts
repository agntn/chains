import { decodeBase58 } from "../core/base58.js";
import { Chain } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";

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

  /**
   * A legacy address is Base58Check: a version byte (0x00 pay-to-pubkey-hash,
   * 0x05 pay-to-script-hash), a 20-byte hash and a 4-byte checksum, 25 bytes in
   * all. Decoding is the check the format needs, because a character-length
   * window lets any 32-byte base58 key through and Solana's System Program is
   * exactly that. The checksum stays unchecked: this is a format check.
   *
   * @param {string} address - Candidate Bitcoin address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const decoded = decodeBase58(address, 35);
    const legacy = decoded?.length === 25 && (decoded[0] === 0x00 || decoded[0] === 0x05);
    if (!legacy && !BECH32_ADDRESS.test(address)) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }
}
