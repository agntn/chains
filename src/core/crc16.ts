/**
 * CRC-16/XMODEM: polynomial 0x1021, zero initial value, no reflection, no final xor.
 *
 * Stellar's SEP-23 Strkeys and TON's TEP-2 addresses both close with it and disagree
 * only on byte order, little-endian on Stellar and big-endian on TON, so the number
 * comes back whole and each caller compares the two bytes its format writes.
 *
 * @param {ArrayLike<number>} payload - Bytes covered by the checksum.
 * @returns {number} The unsigned 16-bit checksum.
 */
export function crc16Xmodem(payload: ArrayLike<number>): number {
  let checksum = 0;
  for (let index = 0; index < payload.length; index++) {
    const byte = payload[index] ?? 0;
    checksum ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) {
      checksum = checksum & 0x8000 ? ((checksum << 1) ^ 0x1021) & 0xffff : (checksum << 1) & 0xffff;
    }
  }
  return checksum;
}
