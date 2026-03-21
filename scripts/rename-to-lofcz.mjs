import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

function mapName(original) {
  if (original === "@plate/scripts") return null;
  if (original.startsWith("@lofcz/")) return original;
  if (original.startsWith("@platejs/"))
    return `@lofcz/platejs-${original.slice("@platejs/".length)}`;
  if (original === "platejs") return "@lofcz/platejs";
  if (original.startsWith("@udecode/"))
    return `@lofcz/udecode-${original.slice("@udecode/".length)}`;
  if (original === "depset") return "@lofcz/depset";
  return null;
}

const ALIAS_RE = /@[^@]*$/;

function updateWorkspaceDep(depName, depValue) {
  if (!depValue.startsWith("workspace:")) return depValue;
  const newName = mapName(depName);
  if (!newName || newName === depName) return depValue;

  const expected = `workspace:${newName}@*`;
  if (depValue === expected) return null; // already correct, signal no change
  return expected;
}

function updateDepsSection(deps) {
  if (!deps) return [deps, false];
  const updated = {};
  let changed = false;
  for (const [key, value] of Object.entries(deps)) {
    const result = updateWorkspaceDep(key, value);
    if (result === null) {
      updated[key] = `workspace:${mapName(key)}@*`;
    } else if (result !== value) {
      updated[key] = result;
      changed = true;
    } else {
      updated[key] = value;
    }
  }
  return [updated, changed];
}

function processPackageJson(filePath) {
  const raw = readFileSync(filePath, "utf-8");
  const pkg = JSON.parse(raw);

  if (pkg.private) return null;

  const newName = mapName(pkg.name);
  if (!newName) return null;

  let dirty = false;

  if (newName !== pkg.name) {
    pkg.name = newName;
    dirty = true;
  }

  for (const section of ["dependencies", "devDependencies"]) {
    if (pkg[section]) {
      const [updated, changed] = updateDepsSection(pkg[section]);
      pkg[section] = updated;
      if (changed) dirty = true;
    }
  }

  if (!pkg.publishConfig || pkg.publishConfig.access !== "public") {
    if (!pkg.publishConfig) pkg.publishConfig = {};
    pkg.publishConfig.access = "public";
    dirty = true;
  }

  if (pkg.repository?.url?.includes("udecode/plate")) {
    pkg.repository.url = pkg.repository.url.replace(
      "udecode/plate",
      "lofcz/plate",
    );
    dirty = true;
  }

  if (!dirty) return null;

  writeFileSync(filePath, `${JSON.stringify(pkg, null, 2)}\n`);
  return newName;
}

function findPackageJsons(dir, depth = 0) {
  const results = [];
  if (depth > 2) return results;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry === ".git")
      continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findPackageJsons(full, depth + 1));
    } else if (entry === "package.json" && depth > 0) {
      results.push(full);
    }
  }
  return results;
}

const packageJsons = findPackageJsons(join(ROOT, "packages"));
const renamed = [];
for (const pj of packageJsons) {
  const name = processPackageJson(pj);
  if (name) renamed.push(name);
}

for (const extra of ["package.json", "apps/www/package.json"]) {
  const filePath = join(ROOT, extra);
  try {
    const raw = readFileSync(filePath, "utf-8");
    const pkg = JSON.parse(raw);
    let changed = false;
    for (const section of ["dependencies", "devDependencies"]) {
      if (pkg[section]) {
        const [updated, sectionChanged] = updateDepsSection(pkg[section]);
        pkg[section] = updated;
        if (sectionChanged) changed = true;
      }
    }
    if (changed) {
      writeFileSync(filePath, `${JSON.stringify(pkg, null, 2)}\n`);
      renamed.push(extra);
    }
  } catch {
    /* file may not exist */
  }
}

if (renamed.length === 0) {
  console.log("All packages already up to date.");
} else {
  console.log(`Updated ${renamed.length} package(s):`);
  for (const name of renamed) console.log(`  ${name}`);
}
