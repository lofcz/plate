// Ambient declarations for asset side-effect imports (CSS, etc.) so tsc
// stops complaining about `import 'katex/dist/katex.min.css'` etc. Vite
// resolves these at build time via its CSS pipeline.
declare module '*.css';
