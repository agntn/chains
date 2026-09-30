import { describe, expect, it } from "vitest";
import manifest from "../../package.json" with { type: "json" };

/** Packages Pi supplies to extensions, per `HOST_PROVIDED_EXTENSION_PACKAGES` in Pi 0.99. */
const hostProvidedPackages = [
  "@earendil-works/pi-agent-core",
  "@earendil-works/pi-ai",
  "@earendil-works/pi-coding-agent",
  "@earendil-works/pi-tui",
  "@mariozechner/pi-agent-core",
  "@mariozechner/pi-ai",
  "@mariozechner/pi-coding-agent",
  "@mariozechner/pi-tui",
  "@sinclair/typebox",
  "typebox",
];

describe("packages the host supplies", () => {
  it("stay out of dependencies, so Pi loads the package without a warning", () => {
    expect(
      Object.keys(manifest.dependencies).filter((name) => hostProvidedPackages.includes(name)),
    ).toEqual([]);
  });

  it("leave typebox an optional peer with the range Pi asks for", () => {
    expect(manifest.peerDependencies.typebox).toBe("*");
    expect(manifest.peerDependenciesMeta.typebox).toEqual({ optional: true });
  });
});
