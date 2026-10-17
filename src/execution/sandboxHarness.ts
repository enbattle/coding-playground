/**
 * Builds the document for the sandboxed execution iframe (`sandbox="allow-scripts"`, no
 * `allow-same-origin` — ADR 0002), with a fresh iframe per run (see RuntimeFrame.tsx), so there's
 * no state leakage between runs.
 *
 * The user's code doesn't run on the iframe's own thread: an opaque-origin srcdoc iframe shares
 * the app's main thread, so a `while (true) {}` there froze the whole page — Stop button included.
 * Instead the iframe starts a Web Worker and only relays its messages (ADR 0013). Removing the
 * iframe destroys the worker, which is what makes Stop immediate even mid-loop.
 *
 * Two browser constraints shape this, both confirmed in Chromium rather than assumed:
 * - The worker is a *classic* worker that `import()`s the user's module: a `type: 'module'`
 *   worker from a blob URL fails to start in an opaque-origin iframe, while a classic one can
 *   dynamically import both blob URLs and esm.sh URLs.
 * - All blob URLs are created inside the iframe/worker from embedded source text, never passed in
 *   from the parent (ADR 0006: blob URLs are origin-scoped, and this iframe's origin is opaque).
 *
 * Import maps don't apply in workers, so curated package specifiers are rewritten to full esm.sh
 * URLs at compile time instead (src/execution/transpile.ts).
 */

// Runs inside the worker. Plain JS in a string: it's shipped as source text, never bundled.
const WORKER_RUNTIME = `
const post = (message) => postMessage(Object.assign({ source: 'coding-playground-runtime' }, message));
const serialize = (value) => {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.stack || value.message;
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
};
for (const level of ['log', 'warn', 'error', 'info', 'debug']) {
  const original = console[level];
  console[level] = function (...args) {
    post({ type: 'console', level: level, text: args.map(serialize).join(' ') });
    original.apply(console, args);
  };
}
self.addEventListener('error', (event) => {
  event.preventDefault();
  post({ type: 'console', level: 'error', text: event.error ? serialize(event.error) : event.message });
});
self.addEventListener('unhandledrejection', (event) => {
  post({ type: 'console', level: 'error', text: 'Uncaught (in promise) ' + serialize(event.reason) });
});

// "Still running" means the module's top level hasn't settled or a timer/interval is pending —
// the parent keeps Stop available exactly that long. Only transitions are reported.
let topLevelDone = false;
let idle = false;
const timers = new Set();
const updateStatus = () => {
  const nowIdle = topLevelDone && timers.size === 0;
  if (nowIdle === idle) return;
  idle = nowIdle;
  post({ type: 'status', status: idle ? 'idle' : 'running' });
};
const nativeSetTimeout = self.setTimeout.bind(self);
const nativeClearTimeout = self.clearTimeout.bind(self);
const nativeSetInterval = self.setInterval.bind(self);
const nativeClearInterval = self.clearInterval.bind(self);
self.setTimeout = (handler, delay, ...args) => {
  if (typeof handler !== 'function') return nativeSetTimeout(handler, delay, ...args);
  const id = nativeSetTimeout(() => {
    timers.delete(id);
    try { handler(...args); } finally { updateStatus(); }
  }, delay);
  timers.add(id);
  updateStatus();
  return id;
};
self.setInterval = (handler, delay, ...args) => {
  const id = nativeSetInterval(handler, delay, ...args);
  timers.add(id);
  updateStatus();
  return id;
};
// Timeout and interval ids share one pool, so either clear function can cancel either kind.
self.clearTimeout = (id) => { nativeClearTimeout(id); timers.delete(id); updateStatus(); };
self.clearInterval = (id) => { nativeClearInterval(id); timers.delete(id); updateStatus(); };

const runUserCode = (code) => {
  const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
  import(url)
    .catch((error) => post({ type: 'console', level: 'error', text: serialize(error) }))
    .finally(() => { topLevelDone = true; updateStatus(); });
};
`;

/**
 * JSON-encodes a value for embedding in an inline <script>. Escaping every `<` (as the
 * still-valid JS escape `<`) rules out `</script` closing the element early and `<!--` +
 * `<script` switching the HTML parser into its double-escaped state, where the real closing tag
 * stops working — both silently broke the whole harness before.
 */
function toInlineScriptLiteral(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function buildRuntimeHarness(code: string): string {
  const workerSource = `${WORKER_RUNTIME}\nrunUserCode(${JSON.stringify(code)});\n`;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
  </head>
  <body>
    <script>
const worker = new Worker(
  URL.createObjectURL(new Blob([${toInlineScriptLiteral(workerSource)}], { type: 'text/javascript' })),
);
worker.onmessage = (event) => parent.postMessage(event.data, '*');
    </script>
  </body>
</html>`;
}
