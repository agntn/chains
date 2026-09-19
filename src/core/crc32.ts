/**
 * CRC-32 as IEEE 802.3 and zlib compute it: reflected polynomial 0xedb88320, all ones
 * in, all ones out. Cardano's Byron addresses close with it over their CBOR payload.
 *
 * @param {ArrayLike<number>} payload - Bytes covered by the checksum.
 * @returns {number} The unsigned 32-bit checksum.
 */
export function crc32(payload: ArrayLike<number>): number {
  let checksum = 0xffffffff;
  for (let index = 0; index < payload.length; index++) {
    checksum ^= payload[index] ?? 0;
    for (let bit = 0; bit < 8; bit++) {
      checksum = checksum & 1 ? (checksum >>> 1) ^ 0xedb88320 : checksum >>> 1;
    }
  }
  return (checksum ^ 0xffffffff) >>> 0;
}
