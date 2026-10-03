// Loads every tests/*.test.ts; each registers its cases with node:test.
// (Node 20's --test doesn't expand globs on Windows, so this replaces one.)
import { readdirSync } from "node:fs";
import { join } from "node:path";

for (const file of readdirSync(__dirname).filter((name) => name.endsWith(".test.ts")).sort()) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require(join(__dirname, file));
}
