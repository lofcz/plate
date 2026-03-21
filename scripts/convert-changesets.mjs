import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dirname, "..", ".changeset");
let converted = 0;

for (const f of readdirSync(dir)) {
  if (!f.endsWith(".md") || f === "README.md") continue;

  const filePath = join(dir, f);
  const original = readFileSync(filePath, "utf-8");
  let content = original;

  content = content.replace(
    /'@platejs\/([^']+)'/g,
    (_, name) => `'@lofcz/platejs-${name}'`,
  );
  content = content.replace(
    /'@udecode\/([^']+)'/g,
    (_, name) => `'@lofcz/udecode-${name}'`,
  );
  content = content.replace(/'platejs'/g, "'@lofcz/platejs'");

  if (content !== original) {
    writeFileSync(filePath, content);
    converted++;
    console.log(`  Converted: ${f}`);
  }
}

if (converted === 0) console.log("  No upstream changesets to convert.");
