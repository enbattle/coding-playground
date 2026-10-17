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

import { formatConsoleArgs } from './consoleFormat';
import { MAX_CONSOLE_ENTRIES } from './store';

// Runs inside the worker. Plain JS in a string: it's shipped as source text, never bundled — except
// formatConsoleArgs, embedded from its own (unit-tested, self-contained) source.
const WORKER_RUNTIME = `
const post = (message) => postMessage(Object.assign({ source: 'coding-playground-runtime' }, message));
const nativeSetTimeout = self.setTimeout.bind(self);
const nativeClearTimeout = self.clearTimeout.bind(self);
const nativeSetInterval = self.setInterval.bind(self);
const nativeClearInterval = self.clearInterval.bind(self);
const formatConsoleArgs = ${formatConsoleArgs.toString()};
const serialize = (value) => formatConsoleArgs([value]);

// Console lines are sent immediately up to a quota per 50 ms window; past that (a flood), they're
// batched — one message per window, trimmed to the latest MAX_LINES with the rest counted.
// Sending one message per call made a tight logging loop bury the page in messages. Batching
// only past the quota matters: a line buffered for a later flush would be stranded by a following
// loop that never yields (console.log('start'); while (true) {}), so ordinary output never waits.
// The window check runs inline on every call, so a flood keeps flowing even without yielding.
const MAX_LINES = ${MAX_CONSOLE_ENTRIES};
const WINDOW_MS = 50;
const IMMEDIATE_PER_WINDOW = 100;
let batch = [];
let dropped = 0;
let windowStart = 0;
let sentInWindow = 0;
let flushScheduled = false;
const flush = () => {
  flushScheduled = false;
  if (batch.length > MAX_LINES) {
    dropped += batch.length - MAX_LINES;
    batch = batch.slice(-MAX_LINES);
  }
  if (batch.length === 0 && dropped === 0) return;
  post({ type: 'console', entries: batch, dropped: dropped });
  batch = [];
  dropped = 0;
};
const emit = (level, text) => {
  const now = Date.now();
  if (now - windowStart >= WINDOW_MS) {
    windowStart = now;
    sentInWindow = 0;
    flush();
  }
  if (batch.length === 0 && sentInWindow < IMMEDIATE_PER_WINDOW) {
    sentInWindow++;
    post({ type: 'console', entries: [{ level: level, text: text }], dropped: 0 });
    return;
  }
  batch.push({ level: level, text: text });
  // Trim in chunks rather than shifting on every line, so a flood stays O(1) per call.
  if (batch.length >= 2 * MAX_LINES) {
    dropped += batch.length - MAX_LINES;
    batch = batch.slice(-MAX_LINES);
  }
  if (!flushScheduled) { flushScheduled = true; nativeSetTimeout(flush, WINDOW_MS); }
};
// Deliberately not also forwarded to the browser's own console: measured during a 200k-line flood,
// that mirroring alone kept the page unresponsive for 8-15 s; without it, the same flood finishes
// in under half a second. The app's console panel is where this output belongs.
for (const level of ['log', 'warn', 'error', 'info', 'debug']) {
  console[level] = function (...args) {
    emit(level, formatConsoleArgs(args));
  };
}
self.addEventListener('error', (event) => {
  event.preventDefault();
  emit('error', event.error ? serialize(event.error) : event.message);
});
self.addEventListener('unhandledrejection', (event) => {
  emit('error', 'Uncaught (in promise) ' + serialize(event.reason));
});

// "Still running" means the module's top level hasn't settled or a timer/interval is pending —
// the parent keeps Stop available exactly that long. Only transitions are reported, and pending
// console lines are flushed first so they never arrive after the status that follows them.
let topLevelDone = false;
let idle = false;
const timers = new Set();
const updateStatus = () => {
  const nowIdle = topLevelDone && timers.size === 0;
  if (nowIdle === idle) return;
  idle = nowIdle;
  flush();
  post({ type: 'status', status: idle ? 'idle' : 'running' });
};
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
    .catch((error) => emit('error', serialize(error)))
    .finally(() => { topLevelDone = true; updateStatus(); });
};
`;

/**
 * JSON-encodes a value for embedding in an inline <script>. Escaping every `<` (as its JS unicode
 * escape, still valid inside a string literal) rules out `</script` closing the element early and `<!--` +
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
