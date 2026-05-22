import fs from 'node:fs';
import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const monorepoRoot = path.resolve(__dirname, '../..');
const packagesDir = path.resolve(monorepoRoot, 'packages');

/**
 * Build a set of workspace package names (`@platejs/<x>` plus `platejs`,
 * `@udecode/<x>`) by scanning the monorepo's `packages/` tree once. We
 * use this for two things:
 *   1. A resolver plugin that maps `<scope>/<pkg>[/<subpath>]` → the
 *      matching `packages/<pkg>/src/[<subpath>/]index.{ts,tsx}` source
 *      file, so vite reads the workspace packages straight from source.
 *   2. `optimizeDeps.exclude` so vite never pre-bundles these into the
 *      `node_modules/.vite/deps/` cache (which was the original source
 *      of stale-build problems when iterating on `@platejs/diff`).
 */
const collectWorkspacePackages = () => {
  // Each entry tells us "the import specifier `<importPrefix>` resolves
  // into directory `<srcDir>`". Subpath imports (`<importPrefix>/foo`)
  // resolve into `<srcDir>/foo/`.
  const entries: { importPrefix: string; srcDir: string }[] = [];

  // Top-level `platejs` package lives at packages/plate.
  const plateSrc = path.join(packagesDir, 'plate/src');
  if (fs.existsSync(plateSrc)) {
    entries.push({ importPrefix: 'platejs', srcDir: plateSrc });
  }

  // Anything under packages/<name> that exposes a `src/` is a candidate.
  for (const dirent of fs.readdirSync(packagesDir, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    // The udecode subtree is its own scope (`@udecode/<x>`), with one
    // extra level of nesting.
    if (dirent.name === 'udecode') {
      const udecodeDir = path.join(packagesDir, 'udecode');
      for (const inner of fs.readdirSync(udecodeDir, {
        withFileTypes: true,
      })) {
        if (!inner.isDirectory()) continue;
        const innerSrc = path.join(udecodeDir, inner.name, 'src');
        if (fs.existsSync(innerSrc)) {
          entries.push({
            importPrefix: `@udecode/${inner.name}`,
            srcDir: innerSrc,
          });
        }
      }
      continue;
    }
    if (dirent.name === 'plate') continue; // already added above
    const src = path.join(packagesDir, dirent.name, 'src');
    if (!fs.existsSync(src)) continue;
    entries.push({
      importPrefix: `@platejs/${dirent.name}`,
      srcDir: src,
    });
  }

  return entries;
};

const workspacePackages = collectWorkspacePackages();

/**
 * Resolver that maps `@platejs/<pkg>` (or `platejs`, `@udecode/<pkg>`)
 * plus any optional `/<subpath>` to the matching source file inside
 * `packages/`. This sidesteps:
 *
 *   - vite pre-bundling the `dist/` build into `.vite/deps/` (the cause
 *     of "I rebuilt the package and the playground still shows old code"
 *     problems), and
 *   - the package's `exports` field pointing at `./dist/index.js` (which
 *     ESM resolution would normally honour).
 *
 * It tries the following resolutions in order, picking the first hit:
 *   1. `<srcDir>/<subpath>/index.ts` / `.tsx`
 *   2. `<srcDir>/<subpath>.ts` / `.tsx`
 *   3. `<srcDir>/index.ts` / `.tsx` (only when there is no subpath)
 *
 * Hot-reload then works on every workspace source edit because vite is
 * watching real files, not a pre-bundled dep cache.
 */
const workspaceSourcePlugin = (): Plugin => {
  // Sort by length DESC so longer prefixes (e.g. `@platejs/list`) match
  // before shorter ones that could swallow them (none currently do, but
  // it's the obviously-correct ordering).
  const sorted = [...workspacePackages].sort(
    (a, b) => b.importPrefix.length - a.importPrefix.length
  );

  const tryResolve = (candidate: string): string | null => {
    for (const ext of ['', '.ts', '.tsx']) {
      const withExt = candidate + ext;
      if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
        return withExt;
      }
    }
    return null;
  };

  return {
    name: 'sciobot-workspace-source-resolver',
    enforce: 'pre',
    resolveId(source) {
      for (const { importPrefix, srcDir } of sorted) {
        if (source !== importPrefix && !source.startsWith(`${importPrefix}/`)) {
          continue;
        }
        const subpath =
          source === importPrefix ? '' : source.slice(importPrefix.length + 1);

        // 1. `<srcDir>/<subpath>/index.{ts,tsx}` or bare `<srcDir>/index.{ts,tsx}`
        const indexBase = subpath
          ? path.join(srcDir, subpath, 'index')
          : path.join(srcDir, 'index');
        const indexHit = tryResolve(indexBase);
        if (indexHit) return indexHit;

        // 2. `<srcDir>/<subpath>.{ts,tsx}` (a flat file, no folder)
        if (subpath) {
          const fileHit = tryResolve(path.join(srcDir, subpath));
          if (fileHit) return fileHit;
        }

        // No match for this prefix — let vite carry on (don't return).
        // Returning null/undefined defers to other resolvers, which will
        // then fall back to the package's `exports` field. That's the
        // safe behaviour when our heuristic doesn't find a source file.
        return null;
      }
      return null;
    },
  };
};

export default defineConfig({
  plugins: [workspaceSourcePlugin(), react()],
  resolve: {
    dedupe: ['react', 'react-dom', 'slate', 'slate-dom'],
  },
  optimizeDeps: {
    // Never pre-bundle workspace packages. We resolve them straight from
    // source via the plugin above, so HMR fires on every edit.
    exclude: [...workspacePackages.map((p) => p.importPrefix), 'platejs/react'],
  },
  server: {
    port: 3999,
    fs: {
      // Allow vite to serve files from the monorepo root so it can read
      // `../../packages/**/src/**` straight off disk.
      allow: [monorepoRoot],
    },
  },
});
