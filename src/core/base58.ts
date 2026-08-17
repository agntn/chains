const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/**
 * Decodes a base58 string to its bytes, or undefined when the input is not base58.
 *
 * Character count does not determine byte count: base58 writes every leading zero
 * byte as "1", so a 32-byte key runs anywhere from 32 characters (Solana's System
 * Program, all zeroes) to 44. A chain that needs to know how many bytes an address
 * carries has to decode it.
 */
export function decodeBase58(input: string): Uint8Array | undefined {
  if (input.length === 0) return undefined;

  let value = 0n;
  for (const character of input) {
    const digit = ALPHABET.indexOf(character);
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
    if (character !== "1") break;
    leadingZeros++;
  }

  const bytes = new Uint8Array(leadingZeros + digits.length);
  bytes.set(digits, leadingZeros);
  return bytes;
}
