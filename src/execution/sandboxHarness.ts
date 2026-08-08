/**
 * Runs inside a sandboxed iframe (`sandbox="allow-scripts"`, no `allow-same-origin` — ADR 0002)
 * with a fresh iframe per run (see RuntimeFrame.tsx), so there's no state leakage between runs.
 *
 * Deliberately does NOT wrap the injected code in a try/catch: once package imports land (Phase
 * 6), user code may contain top-level `import`/`export`, which is a syntax error inside a block
 * statement. The global `error` and `unhandledrejection` listeners below catch synchronous and
 * asynchronous failures alike without needing to wrap the module body at all.
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
`

function escapeForInlineScript(code: string): string {
  return code.replace(/<\/script/gi, '<\\/script')
}

export function buildRuntimeHarness(code: string): string {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>
    <script type="module">
${RUNTIME_SETUP}
${escapeForInlineScript(code)}
    </script>
  </body>
</html>`
}
