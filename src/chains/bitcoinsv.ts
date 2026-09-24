import { decodeBase58Check } from "../core/base58check.js";
import { UTXO } from "../core/chain.js";
import { InvalidAddressError } from "../core/errors.js";

export class BitcoinSv extends UTXO {
  static readonly key = "bitcoinsv" as const;
  readonly name = "Bitcoin SV";
  readonly symbol = "BSV";
  override readonly decimals = 8;
  readonly explorer = "https://whatsonchain.com";
  readonly bip44 = 236;
  override readonly magic = "e3e1f3e8";

  /**
   * Base58Check under 0x00 (`1...`), 25 bytes with the checksum verified. The node decodes
   * nothing else, no CashAddr and no Bech32, and since Genesis it rejects a transaction with a
   * pay-to-script-hash output as `bad-txns-vout-p2sh`, so a `3...` address has no BSV to receive.
   * The bytes are Bitcoin's own, and a `1...` address reads on both chains.
   *
   * @param {string} address - Candidate Bitcoin SV address.
   * @returns {string} The accepted address unchanged.
   */
  override assertAddress(address: string): string {
    const decoded = decodeBase58Check(address, 35);
    if (decoded?.length !== 25 || decoded[0] !== 0x00) {
      throw new InvalidAddressError(this.key, address);
    }
    return address;
  }
}
