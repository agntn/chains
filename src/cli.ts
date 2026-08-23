#!/usr/bin/env node

import { defineCommand, runMain } from "citty";
import { version } from "./version.js";

const main = defineCommand({
  meta: {
    name: "chains",
    version,
    description: "Canonical blockchain metadata, aliases, and address validation",
  },
  subCommands: {
    info: () => import("./commands/info.js").then((m) => m.default),
    resolve: () => import("./commands/resolve.js").then((m) => m.default),
    validate: () => import("./commands/validate.js").then((m) => m.default),
    identify: () => import("./commands/identify.js").then((m) => m.default),
    list: () => import("./commands/list.js").then((m) => m.default),
    mcp: () => import("./commands/mcp.js").then((m) => m.default),
  },
});

await runMain(main);
