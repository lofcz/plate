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
    /(['"])@platejs\/([^'"]+)\1/g,
    (_, q, name) => `${q}@lofcz/platejs-${name}${q}`,
  );
  content = content.replace(
    /(['"])@udecode\/([^'"]+)\1/g,
    (_, q, name) => `${q}@lofcz/udecode-${name}${q}`,
  );
  content = content.replace(/(['"])platejs\1/g, (_, q) => `${q}@lofcz/platejs${q}`);

  if (content !== original) {
    writeFileSync(filePath, content);
    converted++;
    console.log(`  Converted: ${f}`);
  }
}

if (converted === 0) console.log("  No upstream changesets to convert.");
