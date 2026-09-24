import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { BECH32M, polymod } from "../../src/core/bech32.ts";
import { blake2b } from "../../src/core/blake2b.ts";
import { f4jumbleInverse } from "../../src/core/f4jumble.ts";
import { identify, InvalidAddressError, Zcash } from "../../src/index.ts";

const hex = (bytes: ArrayLike<number>) => Buffer.from(Uint8Array.from(bytes)).toString("hex");
const bytes = (text: string) => new Uint8Array(Buffer.from(text, "hex"));
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BECH32_ALPHABET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

const zcash = new Zcash();

const sha256 = (bytes: ArrayLike<number>) =>
  createHash("sha256").update(Uint8Array.from(bytes)).digest();

/**
 * Base58Check with node's SHA-256, independent of the decoder under test.
 * @param {readonly number[]} payload - Version bytes and body.
 * @returns {string} Base58Check text.
 */
function encodeBase58Check(payload: readonly number[]): string {
  const bytes = [...payload, ...sha256(sha256(payload)).subarray(0, 4)];
  let value = BigInt(`0x${hex(bytes)}`);
  let text = "";
  while (value > 0n) {
    text = BASE58_ALPHABET.charAt(Number(value % 58n)) + text;
    value /= 58n;
  }
  return "1".repeat(bytes.findIndex((byte) => byte !== 0)) + text;
}

/** One vector per receiver mix, from zcash-test-vectors `unified_address.json` at master. */
const unified = [
  /** P2PKH + Sapling */
  "u1l8xunezsvhq8fgzfl7404m450nwnd76zshscn6nfys7vyz2ywyh4cc5daaq0c7q2su5lqfh23sp7fkf3kt27ve5948mzpfdvckzaect2jtte308mkwlycj2u0eac077wu70vqcetkxf",
  /** P2PKH + Sapling + Orchard */
  "u1pg2aaph7jp8rpf6yhsza25722sg5fcn3vaca6ze27hqjw7jvvhhuxkpcg0ge9xh6drsgdkda8qjq5chpehkcpxf87rnjryjqwymdheptpvnljqqrjqzjwkc2ma6hcq666kgwfytxwac8eyex6ndgr6ezte66706e3vaqrd25dzvzkc69kw0jgywtd0cmq52q5lkw6uh7hyvzjse8ksx",
  /** Sapling + Orchard */
  "u1ay3aawlldjrmxqnjf5medr5ma6p3acnet464ht8lmwplq5cd3ugytcmlf96rrmtgwldc75x94qn4n8pgen36y8tywlq6yjk7lkf3fa8wzjrav8z2xpxqnrnmjxh8tmz6jhfh425t7f3vy6p4pd3zmqayq49efl2c4xydc0gszg660q9p",
  /** P2PKH + Orchard */
  "u1snf9yr883aj2hm8pksp9aymnqdwzy42rpzuffevj35hhxeckays5pcpeq7vy2mtgzlcuc4mnh9443qnuyje0yx6h59angywka4v2ap6kchh2j96ezf9w0c0auyz3wwts2lx5gmk2sk9",
  /** P2PKH + Orchard + unknown 0xfffc */
  "u1en8ysypun4gdkdnu8zqqg6k73ankr9ffwfzg08wtzg9z939w0wupewemfrc8a630e8gc4uqucym0l4v44fszy3et4veyypt3jsyp0whfpfsn2lw30kj8nepe6wvvasf00wklh85u9v8glqndupmamk9z2ja9sanf70pp4yxvkt3dmyzxa0kkhv2c9pxmkghrxqk0590azvya3nzrtevj449nu3laskrhf7c7nj9cyw7ty38mccg4znrr876guu6pzndx7ngwzhmlsn8d89saf5araaacrhr9958xr6z23mj4qtzzn98whdpu8u7n8fhf5d2vypljda62q73du44sf0e0kxmq3gvgkta0qqgq9w6r403gc5jz2any02etmwlttkv84hgh95czhdf2jugk3u36ke0kchcthg240",
  /** Sapling + unknown 0xfffd */
  "u1sem2gcey0emntrvxyjv8hyhq0w5fr4sxaj3cppgrfqgg6laydh8m78gy2cw2p54zzak3alnnsx4xjuhazpkrfcd90wl0c7ldj6y095hh5j6j2evry9vg5jqp4dyqpwqeryu7pes4sxyyyqwn6egs5daxk4473v9xpgzrwv5n0tvs93nlj4xpphq4vs2w8um9ph7zkte08t7fa509mnrt9apuhr22xq34mp2svjnq6rvfn0hg6lkehxtlj39vgjxjlkjfhx8rw2f02ckq8k5szcxsnhkgr2cqlmf2udl2gqdqr5t6",
  /** Orchard */
  "u1ddnjsdcpm36r6aq79n3s68shjweksnmwtdltrh046s8m6xcws9ygyawalxx8n6hg6vegk0wh8zjnafxgh6msppjsljvyt0ynece3lvm0",
  /** Sapling + Orchard + unknown 0xfffc */
  "u1xdrenc94696j8clxa2xnkdg8xd5t3y8s24urctyxu87vggv0u46qr4lkpnh7gqqdev9wwugt6xkv8c8du8ufhfl8nfjnzusf6cw20wpm85hlshmnmj2lkyhka9rua7qw7kr0xeajk7y2rlsuwl6z6l5l3wq3v6rrqt9e8zy7sc7pww45jznrj4xy6h9rp4kjy5xtl5upr30u4cyk58kv3t80k3p8w97k3e345h7avmjylxakx6sgyk5ss8th5kqay50ewav62eeep7tghzejaflsdstpwz55haex398jqpq27007me2",
  /** P2PKH + Orchard + unknown 0xfffb */
  "u1tqx832p4wsfe9pd67ggm3qsmfuvdhqvw2259y7uwug7y0lpeu87fmgpqh3zmamex3fzs0d4ct4hhsg2csj5z0q5f3f7n656ap8e4nlng9c4440rz9s7ekxanfw6g84f7vu82fumtmlz3vstl2a9ufa0970k4knsz2wpsjt2xycqeay76pt4fx3ak9y7mps2q6qe2n2h7wkakxr7xu6vd36zhhzgln7ttmrzc0f9ye3jmyu2pp8l8rect87lfxj2fgckcwz3svdx70a947fz04kgu7e907enzrk676zdkdmuyw2kyrclkmj62kmyy2rjetpus7knmxfuu7z0m63uwfhdynhuu3yrjqu5y089v8zwnh60mw5ngc0kszdjmc339fk9mjn396m5ekv7h7td7fa0u9097xph3y5vth9af4sw6ykxdms84wr544mxxqtmgj027d9e8rnlrazge0kwyydyhder3chwhmaqjk9skuxgxzternw4xx962qed",
  /** Orchard + unknown 0xffff */
  "u1uehkuaq6rpfgt4ed5zpvhczg9apgpmyk5eq9qg23j8w7jxkhdnqzacte6gu8zgzfzgxy48ryzus3wnkhfxrxmlhs34xde3f34uxcnv3y6dsgj288vu56xs9f6ghvqsgkhuwtz4kkfxj8pa27v5p3ttlst340zvwx9nj6s0zw8p3wwk3zh37dwc7znqz52gj2fpaapzxzyagah0aeyxwa9fxxvyyj6w989v96ymsgf7s8s6ej9346p60fcjzzynvf9rmxevumdvt8l9mvhdfz4u5j4h7e0zjr2sde7fu7z9s02447qg6qzllm22egnx6ej6qczkkk2ygvpy08un9ggp853sddp6vskrlar6sygxec5f6c2t2eu9zmc728esy4sj9z853gxuplr6hw7lpcwzk20d85vuflnhlfv8nr3020r0v9z83ryudsyjv66rttxq2cscqlrdxakrmpjptzcf",
  /** Sapling */
  "u187vrwl4ampyxd5m6aj38n4ndkmj8v6gs97hkt23aps3sn5k89a0gk2smluexgdprcrtm56ezc5c7tjwlrnnl79tjtrxmqd42c5mpyz7g",
];

describe("BLAKE2b", () => {
  /** RFC 7693 appendix A, and the digest of nothing every implementation agrees on. */
  it("hashes the RFC 7693 vectors", () => {
    expect(hex(blake2b(new TextEncoder().encode("abc")))).toBe(
      "ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d17d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923",
    );
    expect(hex(blake2b(new Uint8Array()))).toBe(
      "786a02f742015903c6c6fd852552d272912f4740e15847618a86e217f71f5419d25e1031afee585313896444934eb04b903a685b1448b755d56f701afe9be2ce",
    );
  });

  it("agrees with node:crypto on every length across three block boundaries", () => {
    for (let length = 0; length <= 400; length++) {
      const message = Uint8Array.from({ length }, (_, index) => (index * 7 + length) & 0xff);
      expect(hex(blake2b(message)), `length ${length}`).toBe(
        createHash("blake2b512").update(message).digest("hex"),
      );
    }
  });
});

describe("F4Jumble", () => {
  /** zcash-test-vectors `f4jumble.json`: the first four pairs, normal then jumbled. */
  it.each([
    [
      "5d7a8f739a2d9e945b0ce152a8049e294c4d6e66b164939daffa2ef6ee6921481cdd86b3cc4318d9614fc820905d042b",
      "0304d029141b995da5387c125970673504d6c764d91ea6c082123770c7139ccd88ee27368cd0c0921a0444c8e5858d22",
    ],
    [
      "b1ef9ca3f24988c7b3534201cfb1cd8dbf69b8250c18ef41294ca97993db546c1fe01f7e9c8e36d6a5e29d4e30a73594bf5098421c69378af1e40f64e125946f",
      "5271fa3321f3adbcfb075196883d542b438ec6339176537daf859841fe6a56222bff76d1662b5509a9e1079e446eeedd2e683c31aae3ee1851d7954328526be1",
    ],
    [
      "62c2fa7b2fecbcb64b6968912a6381ce3dc166d56a1d62f5a8d7551db5fd9313e8c7203d996af7d477083756d59af80d06a745f44ab023752cb5b406ed8985e18130ab33362697b0e4e4c763ccb8f676495c222f7fba1e31defa3d5a57efc2e1e9b01a035587d5fb1a38e01d94903d3c3e0ad3360c1d3710acd20b183e31d49f",
      "498cf1b1ba6f4577effe64151d67469adc30acc325e326207e7d78487085b4162669f82f02f9774c0cc26ae6e1a76f1e266c6a9a8a2f4ffe8d2d676b1ed71cc47195a3f19208998f7d8cdfc0b74d2a96364d733a62b4273c77d9828aa1fa061588a7c4c88dd3d3dde02239557acfaad35c55854f4541e1a1b3bc8c17076e7316",
    ],
    [
      "25c9a138f49b1a537edcf04be34a9851a7af9db6990ed83dd64af3597c04323ea51b0052ad8084a8b9da948d320dadd64f5431e61ddf658d24ae67c22c8d1309131fc00fe7f235734276d38d47f1e191e00c7a1d48af046827591e9733a97fa6b679f3dc601d008285edcbdae69ce8fc1be4aac00ff2711ebd931de518856878f7",
      "7508a3a146714f229db91b543e240633ed57853f6451c9db6d64c6e86af1b88b28704f608582c53c51ce7d5b8548827a971d2b98d41b7f6258655902440cd66ee11e84dbfac7d2a43696fd0468810a3d9637c3fa58e7d2d341ef250fa09b9fb71a78a41d389370138a55ea58fcde779d714a04e0d30e61dc2d8be0da61cd684509",
    ],
  ])("undoes the jumble of a %# vector", (normal, jumbled) => {
    expect(hex(f4jumbleInverse(bytes(jumbled)) ?? [])).toBe(normal);
  });

  it("refuses lengths it is not defined for", () => {
    expect(f4jumbleInverse(new Uint8Array(37))).toBeUndefined();
    expect(f4jumbleInverse(new Uint8Array(38))).toHaveLength(38);
  });
});

/**
 * The 16-byte BLAKE2b personalization F4Jumble uses: the tag, i, then the G block counter.
 * @param {string} tag - `UA_F4Jumble_H` or `UA_F4Jumble_G`.
 * @param {number} round - i.
 * @param {number} [block] - G's block counter, little-endian.
 * @returns {number[]} The personalization bytes.
 */
function personal(tag: string, round: number, block = 0): number[] {
  return [...new TextEncoder().encode(tag), round, block & 0xff, block >>> 8];
}

/**
 * XORs two byte strings.
 * @param {ArrayLike<number>} bytes - Input.
 * @param {ArrayLike<number>} mask - Mask, at least as long.
 * @returns {Uint8Array} bytes ⊕ mask.
 */
function xor(bytes: ArrayLike<number>, mask: ArrayLike<number>): Uint8Array {
  return Uint8Array.from(bytes, (byte, index) => byte ^ (mask[index] ?? 0));
}

/**
 * G_i, written again from the ZIP rather than imported, so the test does not grade its own code.
 * @param {number} round - i.
 * @param {ArrayLike<number>} input - Left half.
 * @param {number} length - Right half's length.
 * @returns {Uint8Array} The mask.
 */
function expand(round: number, input: ArrayLike<number>, length: number): Uint8Array {
  const blocks = Array.from({ length: Math.ceil(length / 64) }, (_, block) => [
    ...blake2b(input, 64, personal("UA_F4Jumble_G", round, block)),
  ]);
  return Uint8Array.from(blocks.flat().slice(0, length));
}

/**
 * F4Jumble forwards: x = b ⊕ G_0(a), y = a ⊕ H_0(x), d = x ⊕ G_1(y), c = y ⊕ H_1(d).
 * @param {readonly number[]} message - a || b.
 * @returns {Uint8Array} c || d.
 */
function f4jumble(message: readonly number[]): Uint8Array {
  const leftLength = Math.min(64, Math.floor(message.length / 2));
  const a = message.slice(0, leftLength);
  const b = message.slice(leftLength);
  const x = xor(b, expand(0, a, b.length));
  const y = xor(a, blake2b(x, leftLength, personal("UA_F4Jumble_H", 0)));
  const d = xor(x, expand(1, y, x.length));
  const c = xor(y, blake2b(d, leftLength, personal("UA_F4Jumble_H", 1)));
  return Uint8Array.from([...c, ...d]);
}

/**
 * Writes raw items the way a Unified Address producer does, rules or not.
 * @param {readonly (readonly number[])[]} items - Typecode, length and body bytes per item, as written.
 * @param {string} [hrp] - Human-readable part.
 * @param {string} [padded] - Text in the padding, the human-readable part unless a test forges it.
 * @returns {string} Bech32m text with a checksum that holds.
 */
function encodeUnified(items: readonly (readonly number[])[], hrp = "u", padded = hrp): string {
  const padding = [...new TextEncoder().encode(padded)];
  while (padding.length < 16) padding.push(0);
  const jumbled = f4jumble([...items.flat(), ...padding]);
  const digits: number[] = [];
  let accumulator = 0;
  let bits = 0;
  for (const byte of jumbled) {
    accumulator = (accumulator << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      digits.push((accumulator >> bits) & 31);
    }
    accumulator &= (1 << bits) - 1;
  }
  if (bits > 0) digits.push((accumulator << (5 - bits)) & 31);
  const residue = polymod(hrp, [...digits, 0, 0, 0, 0, 0, 0]) ^ BECH32M;
  for (let index = 0; index < 6; index++) digits.push((residue >> (5 * (5 - index))) & 31);
  return `${hrp}1${digits.map((digit) => BECH32_ALPHABET[digit]).join("")}`;
}

const item = (typecode: number, length: number, fill = 1) => [
  typecode,
  length,
  ...Array.from({ length }, () => fill),
];
const orchard = item(0x03, 43);
const sapling = item(0x02, 43, 2);
const p2pkh = item(0x00, 20, 3);
const p2sh = item(0x01, 20, 4);

describe("Zcash address validation", () => {
  /** Paid to in block 3494750, read through Blockchair on 2026-09-24. */
  it("accepts transparent pay-to-pubkey-hash and script-hash addresses seen on chain", () => {
    for (const address of [
      "t1TSE2jJnpSrV9ThaBh52oC4EWiNMUb4wAD",
      "t1fnsKsS6vbSYFnfGpT1vgEPiP5ifnh2fnd",
      "t3PhSoyT2TiwCFrWWSezMunsanvVbxXXZAw",
      "t3cFfPt1Bcvgez9ZbMBFWeZsskxTkPzGCow",
    ]) {
      expect(zcash.assertAddress(address), address).toBe(address);
    }
  });

  /** ZIP-320's reference pair: the same key hash as `t1...` and as `tex1...`. */
  it("accepts a ZIP-320 TEX address and the transparent one it is written from", () => {
    expect(zcash.assertAddress("t1VmmGiyjVNeCjxDZzg7vZmd99WyzVby9yC")).toBe(
      "t1VmmGiyjVNeCjxDZzg7vZmd99WyzVby9yC",
    );
    expect(zcash.assertAddress("tex1s2rt77ggv6q989lr49rkgzmh5slsksa9khdgte")).toBe(
      "tex1s2rt77ggv6q989lr49rkgzmh5slsksa9khdgte",
    );
  });

  /** zcashd's `z_validateaddress` example, kept in zallet's tests. */
  it("accepts a Sapling address", () => {
    const address =
      "zs1z7rejlpsa98s2rrrfkwmaxu53e4ue0ulcrw0h4x5g8jl04tak0d3mm47vdtahatqrlkngh9slya";
    expect(zcash.assertAddress(address)).toBe(address);
    expect(zcash.assertAddress(address.toUpperCase())).toBe(address.toUpperCase());
  });

  it("accepts every receiver mix in the Unified Address vectors, unknown typecodes included", () => {
    for (const address of unified) expect(zcash.assertAddress(address), address).toBe(address);
  });

  /** From `zcash_address`'s encoding tests. */
  it("accepts the Unified Address zcash_address round-trips", () => {
    const address =
      "u1qpatys4zruk99pg59gcscrt7y6akvl9vrhcfyhm9yxvxz7h87q6n8cgrzzpe9zru68uq39uhmlpp5uefxu0su5uqyqfe5zp3tycn0ecl";
    expect(zcash.assertAddress(address)).toBe(address);
  });

  it("rejects every Unified Address vector one digit off", () => {
    for (const address of unified) {
      for (const index of [2, Math.floor(address.length / 2), address.length - 1]) {
        const digit = BECH32_ALPHABET.indexOf(address.charAt(index));
        const typo = `${address.slice(0, index)}${BECH32_ALPHABET.charAt((digit + 1) % 32)}${address.slice(index + 1)}`;
        expect(() => zcash.assertAddress(typo), typo).toThrow(InvalidAddressError);
      }
    }
  });

  it("accepts built addresses that keep ZIP-316's rules", () => {
    for (const items of [[orchard], [sapling], [p2sh, orchard], [p2pkh, sapling, orchard]]) {
      const address = encodeUnified(items);
      expect(zcash.assertAddress(address), address).toBe(address);
    }
    /** SHOULD-understand metadata is ignored, like any unknown item. */
    expect(zcash.assertAddress(encodeUnified([orchard, item(0xc0, 4)]))).toBeTruthy();
  });

  it.each([
    ["transparent receivers only", [p2pkh]],
    ["P2PKH beside P2SH", [p2pkh, p2sh, orchard]],
    ["descending typecodes", [orchard, sapling]],
    ["a repeated typecode", [orchard, orchard]],
    ["a 42-byte Orchard receiver", [item(0x03, 42)]],
    ["a 21-byte P2PKH receiver", [item(0x00, 21), orchard]],
    ["MUST-understand metadata, which Revision 0 refuses", [orchard, item(0xe0, 4)]],
    ["metadata alone", [item(0xc0, 30)]],
    ["an item longer than the rest of the address", [orchard, [0x04, 60, 1, 2, 3]]],
    ["a CompactSize written long", [[0xfd, 0x03, 0x00, 43, ...orchard.slice(2)]]],
    ["a typecode past 0x2000000", [orchard, [0xfe, 0x01, 0x00, 0x00, 0x02, 1, 0]]],
  ] as const)("rejects a Unified Address with %s", (_, items) => {
    const address = encodeUnified(items);
    expect(() => zcash.assertAddress(address), address).toThrow(InvalidAddressError);
  });

  it.each(["x", "uview", "U", ""])("rejects a Unified Address padded with %j", (padded) => {
    const address = encodeUnified([orchard], "u", padded);
    expect(() => zcash.assertAddress(address), address).toThrow(InvalidAddressError);
  });

  /** Testnet writes `tm`, `ztestsapling`, `textest` and `utest`; the last three are zcash_address's. */
  it("rejects testnet addresses", () => {
    for (const address of [
      "ztestsapling1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqfhgwqu",
      "textest1qyqszqgpqyqszqgpqyqszqgpqyqszqgpfcjgfy",
      "utest10c5kutapazdnf8ztl3pu43nkfsjx89fy3uuff8tsmxm6s86j37pe7uz94z5jhkl49pqe8yz75rlsaygexk6jpaxwx0esjr8wm5ut7d5s",
      encodeUnified([orchard], "utest"),
    ]) {
      expect(() => zcash.assertAddress(address), address).toThrow(InvalidAddressError);
    }
  });

  /** Testnet's 0x1d25 and 0x1cba fail, and so does one byte of a mainnet version changed. */
  it("reads the two version bytes of a transparent address", () => {
    const body = Array.from({ length: 20 }, (_, index) => index);
    for (const version of [
      [0x1c, 0xb8],
      [0x1c, 0xbd],
    ]) {
      const address = encodeBase58Check([...version, ...body]);
      expect(zcash.assertAddress(address), address).toBe(address);
    }
    for (const version of [
      [0x1d, 0x25],
      [0x1c, 0xba],
      [0x1c, 0xb9],
      [0x1d, 0xb8],
    ]) {
      const address = encodeBase58Check([...version, ...body]);
      expect(() => zcash.assertAddress(address), address).toThrow(InvalidAddressError);
    }
  });

  /** ZIP 211 closed the Sprout pool to new value at Canopy. */
  it("rejects a Sprout address, which nothing can pay any more", () => {
    expect(() =>
      zcash.assertAddress(
        "zc8E5gYid86n4bo2Usdq1cpr7PpfoJGzttwBHEEgGhGkLUg7SPPVFNB2AkRFXZ7usfphup5426dt1buMmY3fkYeRrQGLa8y",
      ),
    ).toThrow(InvalidAddressError);
  });

  it("rejects truncated, mistyped and foreign addresses", () => {
    for (const address of [
      "t1VydNnkjBzfL1iAMyUbwGKJAF7Pgvu",
      "t1TSE2jJnpSrV9ThaBh52oC4EWiNMUb4wAE",
      "zs1z7rejlpsa98s2rrrfkwmaxu53e4ue0ulcrw0h4x5g8jl04tak0d3mm47vdtahatqrlkngh9slyq",
      "tex1s2rt77ggv6q989lr49rkgzmh5slsksa9khdgta",
      "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
    ]) {
      expect(() => zcash.assertAddress(address), address).toThrow(InvalidAddressError);
    }
  });

  /** A Sapling payload under Bech32m, or a TEX payload under Bech32, fails on the residue. */
  it("keeps each encoding to its own checksum", () => {
    const tex = "tex1s2rt77ggv6q989lr49rkgzmh5slsksa9khdgte";
    const data = Array.from(tex.slice(4), (character) => BECH32_ALPHABET.indexOf(character));
    const residue = polymod("tex", [...data.slice(0, -6), 0, 0, 0, 0, 0, 0]) ^ 1;
    const bech32 = `tex1${[...data.slice(0, -6), ...[0, 1, 2, 3, 4, 5].map((index) => (residue >> (5 * (5 - index))) & 31)].map((digit) => BECH32_ALPHABET[digit]).join("")}`;
    expect(() => zcash.assertAddress(bech32)).toThrow(InvalidAddressError);
  });
});

describe("Zcash identification", () => {
  /** No other registered chain writes 0x1cb8, 0x1cbd, `zs`, `tex` or `u`. */
  it("is the only chain identify names for each Zcash form", () => {
    for (const address of [
      "t1TSE2jJnpSrV9ThaBh52oC4EWiNMUb4wAD",
      "t3PhSoyT2TiwCFrWWSezMunsanvVbxXXZAw",
      "zs1z7rejlpsa98s2rrrfkwmaxu53e4ue0ulcrw0h4x5g8jl04tak0d3mm47vdtahatqrlkngh9slya",
      "tex1s2rt77ggv6q989lr49rkgzmh5slsksa9khdgte",
      unified[2] ?? "",
    ]) {
      expect(
        identify(address).matches.map((chain) => chain.key),
        address,
      ).toEqual(["zcash"]);
    }
  });
});
