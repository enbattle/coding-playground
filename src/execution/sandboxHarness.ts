/**
 * Runs inside a sandboxed iframe (`sandbox="allow-scripts"`, no `allow-same-origin` — ADR 0002)
 * with a fresh iframe per run (see RuntimeFrame.tsx), so there's no state leakage between runs.
 *
 * Single file only for now (ADR 0008) — no cross-file import map needed, so the compiled code's
 * blob URL is created inside the iframe (ADR 0006: blob URLs are origin-scoped, so a parent-created
 * one can't be loaded here) and run via a plain dynamic `import()`.
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

  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>
    <script>
${RUNTIME_SETUP}
var __cpUrl = URL.createObjectURL(new Blob([${codeJson}], { type: 'text/javascript' }));
import(__cpUrl);
    </script>
  </body>
</html>`;
}
