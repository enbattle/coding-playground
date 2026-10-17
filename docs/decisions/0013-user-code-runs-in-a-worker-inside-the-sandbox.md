# 0013 - User code runs in a Web Worker inside the sandboxed iframe

## Status

Accepted. Amends [0002](./0002-execution-is-worker-plus-sandboxed-iframe.md): the sandboxed iframe
stays, but it no longer runs the user's code on its own thread.

## Context

There was no way to stop a running program. Adding a Stop button exposed why that wasn't just a
missing button: measured in Chromium against the real build, a `while (true) {}` in user code
froze the _entire page_ — no frames rendered for 8+ seconds, and even a script trying to remove
the sandbox iframe couldn't run. An opaque-origin `srcdoc` iframe shares the app's main thread, so
the moment user code spins, the Stop button (and everything else) is unclickable.

A wall-clock timeout doesn't fix this either: the timer that would fire it lives on the same frozen
thread. And it would kill legitimate long-running programs — `setInterval` demos, RxJS timers —
which idle between callbacks rather than spinning.

## Decision

The sandboxed iframe (`sandbox="allow-scripts"`, no `allow-same-origin`) now only starts a Web
Worker and relays its messages to the parent. The user's compiled module runs inside that worker.
Stop unmounts the iframe, which destroys the worker immediately, even mid-loop (measured: the page
stays at normal frame latency during an infinite loop, and removal takes a few milliseconds).

Constraints found while building it, each confirmed in Chromium rather than assumed:

- The worker must be a **classic** worker that `import()`s the user's module from a blob URL. A
  `type: 'module'` worker created from a blob URL fails to start inside an opaque-origin iframe; a
  classic worker can dynamically import both blob and esm.sh URLs.
- **Import maps don't apply in workers**, so the static `<script type="importmap">` is gone.
  Curated package specifiers are rewritten to their full esm.sh URLs at compile time, by a
  TypeScript `after` transformer in `src/execution/transpile.ts` (after, so TypeScript's own
  type-only/unused import elision has already run).
- All blob URLs are still created inside the iframe/worker from embedded source text (ADR 0006).

The worker also reports when it goes idle — the module's top level has settled and no
timeout/interval is pending — so the UI shows Stop exactly as long as there's something to stop.

No timeout. With the page always responsive, the user can always see output and click Stop, and
any fixed limit would cut off legitimate programs.

## Consequences

Infinite loops and runaway timers can always be stopped, and can no longer freeze the app.
Starting another Run also kills the previous program, and a slower, older compile can no longer
overwrite a newer run's result.

User code no longer has DOM globals: `document`, `window`, and `alert` are undefined in a worker
(`self`/`globalThis` still work). In practice this gives up nothing: the iframe was hidden (the
Preview tab was removed in ADR 0008), and `alert` was already blocked by the sandbox. DOM access
now fails loudly (`ReferenceError: document is not defined`) instead of silently doing nothing.
If a DOM preview ever returns, it needs its own visible iframe with DOM access. That's a separate
design, and this worker can't provide it.

Untracked async work (an un-awaited `fetch().then(...)` with no timer) can still log after the
sandbox reports idle. The output still appears; Stop just isn't shown for it.
