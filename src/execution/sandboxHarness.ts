import { PACKAGE_IMPORT_MAP } from '../packages/registry';

/**
 * Runs inside a sandboxed iframe (`sandbox="allow-scripts"`, no `allow-same-origin` — ADR 0002)
 * with a fresh iframe per run (see RuntimeFrame.tsx), so there's no state leakage between runs.
 *
 * Single file only for now (ADR 0008) — no cross-file import map needed for local code, so the
 * compiled code's blob URL is created inside the iframe (ADR 0006: blob URLs are origin-scoped, so
 * a parent-created one can't be loaded here) and run via a plain dynamic `import()`.
 *
 * Curated packages (ADR 0003, ADR 0009) are a different case: `import { z } from 'zod'` is a *bare*
 * specifier, not a relative one, so it isn't subject to ADR 0006's blob-URL-referrer restriction —
 * bare specifiers resolve straight through the import map regardless of the importing module's own
 * URL. That means the package import map can be a plain static `<script type="importmap">`, known
 * entirely at build time, with no bootstrap-script computation needed the way local blob URLs need.
 */

const RUNTIME_SETUP = `
const post = (type, payload) => parent.postMessage(Object.assign({ source: 'coding-playground-runtime', type }, payload), '*')
const serialize = (value) => {
  if (typeof value === 'string') return value
  if (value instanceof Error) return value.stack || value.message
  try { return JSON.stringify(value, null, 2) } catch { return String(value) }
}
for (const level of ['log', 'warn', 'error', 'info', 'debug']) {
  const original = console[level]
  console[level] = function (...args) {
    post('console', { level: level, text: args.map(serialize).join(' ') })
    original.apply(console, args)
  }
}
window.addEventListener('error', (event) => {
  post('console', { level: 'error', text: event.error ? serialize(event.error) : event.message })
})
window.addEventListener('unhandledrejection', (event) => {
  post('console', { level: 'error', text: 'Uncaught (in promise) ' + serialize(event.reason) })
})
`;

function escapeForInlineScript(text: string): string {
  return text.replace(/<\/script/gi, '<\\/script');
}

export function buildRuntimeHarness(code: string): string {
  const codeJson = escapeForInlineScript(JSON.stringify(code));
  const importMapJson = escapeForInlineScript(JSON.stringify({ imports: PACKAGE_IMPORT_MAP }));

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <script type="importmap">${importMapJson}</script>
  </head>
  <body>
    <script>
${RUNTIME_SETUP}
var __cpUrl = URL.createObjectURL(new Blob([${codeJson}], { type: 'text/javascript' }));
import(__cpUrl);
    </script>
  </body>
</html>`;
}
