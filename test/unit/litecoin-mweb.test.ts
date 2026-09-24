import { describe, expect, it } from "vitest";
import { InvalidAddressError, Litecoin, identify } from "../../src/index.ts";

/** Published MWEB receiving addresses, each from a different project's donation page or README. */
const valid = [
  "ltcmweb1qqt9rwznnxzkghv4s5wgtwxs0m0ry6n3atp95f47slppapxljde3xyqmdlnrc8ag7y2k354jzdc4pc4ks0kr43jehr77lngdecgh6689nn5mgv5yn",
  "ltcmweb1qq09xjylkspy5yx034ktr5r7fu7axkjha295r4tuk7ffxzqxkrk09cq6q6hyeve46954h540rxdwuufnpjrsun7jj452rqalgdme4wsjdnqm2h4wz",
  "ltcmweb1qqdy4u664glaky29lqlekwzk6t6gejs3huush68jtvrdtgd802d8ywqn8y6auz0yjw9h7nmgz276am9zpql5qk4xg8f6g5g8q70p89j5z8uhehjvn",
  "ltcmweb1qq06pgdyw2xlwy64vhz3l903kmp84j0qgx9nu7er8ckr6tp2289r9sqe9ntqyzyd2usf298ln5cvpfc7wccsys320ajr5sx8hfy43eut74c2jae4c",
];

/** The first valid address re-encoded with one rule broken and a checksum that holds. */
const invalid = {
  bech32m:
    "ltcmweb1qqt9rwznnxzkghv4s5wgtwxs0m0ry6n3atp95f47slppapxljde3xyqmdlnrc8ag7y2k354jzdc4pc4ks0kr43jehr77lngdecgh6689nn5w5ucp3",
  "version digit 1":
    "ltcmweb1pqt9rwznnxzkghv4s5wgtwxs0m0ry6n3atp95f47slppapxljde3xyqmdlnrc8ag7y2k354jzdc4pc4ks0kr43jehr77lngdecgh6689nn5a0kd2u",
  "65 bytes":
    "ltcmweb1qqt9rwznnxzkghv4s5wgtwxs0m0ry6n3atp95f47slppapxljde3xyqmdlnrc8ag7y2k354jzdc4pc4ks0kr43jehr77lngdecgh6689ndzu3fh",
  "non-zero padding":
    "ltcmweb1qqt9rwznnxzkghv4s5wgtwxs0m0ry6n3atp95f47slppapxljde3xyqmdlnrc8ag7y2k354jzdc4pc4ks0kr43jehr77lngdecgh6689nn4x7cpep",
  "testnet tmweb":
    "tmweb1qqt9rwznnxzkghv4s5wgtwxs0m0ry6n3atp95f47slppapxljde3xyqmdlnrc8ag7y2k354jzdc4pc4ks0kr43jehr77lngdecgh6689nn56pdrcy",
  "the SegWit prefix":
    "ltc1qqt9rwznnxzkghv4s5wgtwxs0m0ry6n3atp95f47slppapxljde3xyqmdlnrc8ag7y2k354jzdc4pc4ks0kr43jehr77lngdecgh6689nn5vempev",
};

const litecoin = new Litecoin();

describe("Litecoin MWEB validation", () => {
  it.each(valid)("accepts the stealth address %s in either case", (address) => {
    for (const candidate of [address, address.toUpperCase()]) {
      expect(litecoin.assertAddress(candidate)).toBe(candidate);
    }
  });

  it.each(Object.entries(invalid))("rejects %s", (_, address) => {
    expect(() => litecoin.assertAddress(address)).toThrow(InvalidAddressError);
  });

  it.each(valid)("rejects a checksum substitution in %s", (address) => {
    const replacement = address.endsWith("q") ? "p" : "q";
    expect(() => litecoin.assertAddress(address.slice(0, -1) + replacement)).toThrow(
      InvalidAddressError,
    );
  });

  it("rejects mixed case and oversized input", () => {
    const [address = ""] = valid;
    expect(() => litecoin.assertAddress(`LTCMWEB1${address.slice(8)}`)).toThrow(
      InvalidAddressError,
    );
    expect(() => litecoin.assertAddress(`ltcmweb1${"q".repeat(1000)}`)).toThrow(
      InvalidAddressError,
    );
  });

  it("names Litecoin alone for a stealth address", () => {
    const [address = ""] = valid;
    expect(identify(address).matches.map((chain) => chain.key)).toEqual(["litecoin"]);
  });
});
