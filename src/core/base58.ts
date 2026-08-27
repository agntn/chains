const BITCOIN_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/**
 * Decodes a base58 string to its bytes, or undefined when the input is not
 * base58 or longer than maxLength.
 *
 * Character count does not determine byte count: base58 writes every leading zero
 * byte as "1", so a 32-byte key runs anywhere from 32 characters (Solana's System
 * Program, all zeroes) to 44. A chain that needs to know how many bytes an address
 * carries has to decode it.
 *
 * The alphabet is a parameter because base58 is an ordering, not one encoding: read
 * an XRP Ledger address off Bitcoin's ordering and the bytes come back wrong rather
 * than rejected. The zero digit moves with the alphabet, so leading zeros follow it.
 *
 * The bound is required because decoding is quadratic: every character grows the
 * BigInt the next multiply has to walk, and a 100k-character string ties the
 * process up for seconds. An address format knows its maximum length, so the
 * caller states it and oversized input is rejected before any work.
 */
export function decodeBase58(
  input: string,
  maxLength: number,
  alphabet: string = BITCOIN_ALPHABET,
): Uint8Array | undefined {
  if (input.length === 0 || input.length > maxLength) return undefined;

  let value = 0n;
  for (const character of input) {
    const digit = alphabet.indexOf(character);
    if (digit < 0) return undefined;
    value = value * 58n + BigInt(digit);
  }

  const digits: number[] = [];
  while (value > 0n) {
    digits.unshift(Number(value % 256n));
    value /= 256n;
  }

  let leadingZeros = 0;
  for (const character of input) {
    if (character !== alphabet[0]) break;
    leadingZeros++;
  }

  const bytes = new Uint8Array(leadingZeros + digits.length);
  bytes.set(digits, leadingZeros);
  return bytes;
}
