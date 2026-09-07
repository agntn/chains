import { describe, expect, it } from "vitest";
import { Bitcoin, InvalidAddressError, Litecoin, identify } from "../../src/index.ts";

const p2wpkh = "ltc1qhdhvrwe6rgqns8fz28tee0hphr5x7ulw5exv4w";

/** Mainnet vectors: https://github.com/litecoin-project/litecoin/blob/master/src/test/data/key_io_valid.json */
const validMainnet = [
  p2wpkh,
  "ltc1qa9dykljtgeayhm8ygx25sc22p0wzgudpe4hw9dyvaz0ye3j5kduq9mf68z",
  "ltc1ppu2gv0tujus0f6eggrk7eqmaf0567x6zer4fcuhz4z7ztzq9u9yseqxltc",
  "ltc1zjwls6j8c4u",
  "ltc1qxjkwr09apz3w5hsr33uyq9sdfx8tn26g39g00g",
  "ltc1qjaxhjwmp26afq279pza0zd6lrguxfcee08fw4xv5r6ksrr0wk4uqzjxfdz",
  "ltc1p59fcnxdn05t6adags3dc0vuvm4ejd7chsspp9ryqkvvlxrwkdylqfsruty",
  "ltc1zpr0qrh9zvs",
];

/** The `ltc1` rows of key_io_invalid.json: correct checksums over programs BIP-350 rules out. */
const invalid = [
  "ltc10utujc7h82n098qam35qv4sm4kztue0lh04er7zf6lslcwfmhc92kym83guu06nrvl56g2ekm",
  "ltc153m7rf",
  "ltc1qfflgggucfrs482us7q786eew4ryqta3vl2aspf",
  "ltc1pdhzupjn6sdyalpqn2flajzeyh7qw7r68z6zqnky8ns07k2du90jsd76y75",
  "ltc10wqhm0mq4dq3gcckz0vpa00k62awh67cdwymfu6jc2jttg8n8sdwjdy6hst25zf37fcneh0fh",
  "ltc1qc7c53klkh5hhutxursumtl4eevq03vhzq",
  "ltc1qc243zefnc9kzmsw72nytw4542g9nhwlxepjl6l",
  "ltc1pt9dz00jx8y7x8ylmwe8q0llyrzs32px96wgsm8znsnmj9cgs0ffszkcwyf",
  "ltc1pdtjxt",
  "ltc1q0susza3qwj6lyp7d2q6g258vrgqw4afzt",
  "LTC1Q3ME3JU4NWKE72UUETHLKLZMWQAVTDG4AG8FXSK",
];

/** Valid on testnet and regtest, so a mainnet validator has to turn them away. */
const otherNetworks = [
  "tltc1qpftpsvdn6mjp8celrkj0qxqy4jlapl959rlwg9",
  "tltc1pfnh6ljtrdgk4hh3acvu39a742vaqmd2khnd0tp9d0prcnvpq6zgqn0ecgk",
  "rltc1q3kquwp848h4juq7rl5q3wqsr29pd3d6wprzz8k",
  "rltc1sp4r7tfack86dyy6mhs0ptnzrccdhce92kuvzuna7085xg8qm7kxm0fq7xzfsd889mzm4we",
];

const litecoin = new Litecoin();

describe("Litecoin SegWit validation", () => {
  it.each(validMainnet)("accepts the Litecoin Core mainnet vector %s in either case", (address) => {
    for (const candidate of [address.toLowerCase(), address.toUpperCase()]) {
      expect(litecoin.assertAddress(candidate)).toBe(candidate);
    }
  });

  it.each(invalid)("rejects the Litecoin Core invalid vector %s", (address) => {
    expect(() => litecoin.assertAddress(address)).toThrow(InvalidAddressError);
  });

  it.each(otherNetworks)("rejects the testnet or regtest address %s", (address) => {
    expect(() => litecoin.assertAddress(address)).toThrow(InvalidAddressError);
  });

  it.each(validMainnet)("rejects a checksum substitution in %s", (address) => {
    const replacement = address.endsWith("q") ? "p" : "q";
    expect(() => litecoin.assertAddress(address.slice(0, -1) + replacement)).toThrow(
      InvalidAddressError,
    );
  });

  it.each(["", "ltc1" + "q".repeat(1000), "ltc1zjwls6j8c4u\n", "ltc1zjwls6j8c4u "])(
    "rejects malformed input %j",
    (address) => {
      expect(() => litecoin.assertAddress(address)).toThrow(InvalidAddressError);
    },
  );

  it("keeps each chain's SegWit addresses out of the other", () => {
    expect(() => litecoin.assertAddress("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4")).toThrow(
      InvalidAddressError,
    );
    expect(() => new Bitcoin().assertAddress(p2wpkh)).toThrow(InvalidAddressError);
    const keys = identify(p2wpkh).matches.map((chain) => chain.key);
    expect(keys).toContain("litecoin");
    expect(keys).not.toContain("bitcoin");
  });
});
