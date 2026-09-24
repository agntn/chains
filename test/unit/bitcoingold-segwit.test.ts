import { describe, expect, it } from "vitest";
import { Bitcoin, BitcoinGold, InvalidAddressError, Litecoin, identify } from "../../src/index.ts";

/** Paid to in block 965872, read through btgexplorer.com on 2026-09-24. */
const p2wpkh = "btg1qufmped88t65gh7vn9ftzjwlx9tf5a3en692wvq";

/** Mainnet vectors: https://github.com/BTCGPU/BTCGPU/blob/master/src/test/data/key_io_valid.json */
const validMainnet = [
  p2wpkh,
  "btg1qxkth756aqnu93m4pmqgmus3zsg2gz3z9s56s5f",
  "btg1q5cuatynjmk4szh40mmunszfzh7zrc5xmn8padv",
  "btg1qkw7lz3ahms6e0ajv27mzh7g62tchjpmve4afc29u7w49tddydy2s2vtjh5",
  "btg1p5rgvqejqh9dh37t9g94dd9cm8vtqns7dndgj423egwggsggcdzms7pg7wc",
  "btg1zr4pqk06j6k",
  "btg1qz377zwe5awr68dnggengqx9vrjt05k98kcktlm",
  "btg1qkmhskpdzg8kdkfywhu09kswwn9qan9vnkrf6mk40jvnr06s6sz5s7frh5h",
  "btg1ps8cndas60cntk8x79sg9f5e5jz7x050z8agyugln2ukkks23rryq0eklxj",
  "btg1zn4ts5uwx8l",
];

/** The testnet, signet and regtest rows of the same file, so a mainnet validator turns them away. */
const otherNetworks = [
  "tbtg1q74fxwnvhsue0l8wremgq66xzvn48jlc5fkf03n",
  "tbtg1ph9v3e8nxct57hknlkhkz75p5pnxnkn05cw8ewpxu6tek56g29xgqk259fw",
  "tbtg1q0sqzfp3zj42u0perxr6jahhu4y03uw4d0ug9df",
  "btgrt1qwf52dt9y2sv0f7fwkcpmtfjf74d4np2scjpw3e",
  "btgrt1p3xat2ryucc2v0adrktqnavfzttvezrr27ngltsa2726p2ehvxz4speqk0k",
];

const bitcoinGold = new BitcoinGold();

describe("Bitcoin Gold SegWit validation", () => {
  it.each(validMainnet)("accepts the BTCGPU mainnet vector %s in either case", (address) => {
    for (const candidate of [address.toLowerCase(), address.toUpperCase()]) {
      expect(bitcoinGold.assertAddress(candidate)).toBe(candidate);
    }
  });

  it.each(otherNetworks)("rejects the testnet, signet or regtest address %s", (address) => {
    expect(() => bitcoinGold.assertAddress(address)).toThrow(InvalidAddressError);
  });

  it.each(validMainnet)("rejects a checksum substitution in %s", (address) => {
    const replacement = address.endsWith("q") ? "p" : "q";
    expect(() => bitcoinGold.assertAddress(address.slice(0, -1) + replacement)).toThrow(
      InvalidAddressError,
    );
  });

  it("rejects mixed case", () => {
    expect(() => bitcoinGold.assertAddress("btg1QUFMPED88T65GH7VN9FTZJWLX9TF5A3EN692WVQ")).toThrow(
      InvalidAddressError,
    );
  });

  it("keeps Bitcoin Gold's SegWit addresses apart from Bitcoin's and Litecoin's", () => {
    for (const address of [
      "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
      "ltc1qhdhvrwe6rgqns8fz28tee0hphr5x7ulw5exv4w",
    ]) {
      expect(() => bitcoinGold.assertAddress(address), address).toThrow(InvalidAddressError);
    }
    expect(() => new Bitcoin().assertAddress(p2wpkh)).toThrow(InvalidAddressError);
    expect(() => new Litecoin().assertAddress(p2wpkh)).toThrow(InvalidAddressError);
    expect(identify(p2wpkh).matches.map((chain) => chain.key)).toEqual(["bitcoingold"]);
  });
});
