/**
 * Runs inside a sandboxed iframe (`sandbox="allow-scripts"`, no `allow-same-origin` — ADR 0002)
 * with a fresh iframe per run (see RuntimeFrame.tsx), so there's no state leakage between runs.
 *
 * Cross-file imports (ADR 0006): blob URLs are origin-scoped, and this iframe deliberately has an
 * opaque origin different from the parent page's, so it cannot load blob URLs the parent creates.
 * Every file's compiled JS is instead embedded as text and turned into blob URLs *by a script
 * running inside the iframe itself* — same-origin to itself — which then `document.write()`s the
 * import map and the entry's module script tag before the parser reaches them.
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

export interface HarnessInput {
  /** Path of the file to execute, e.g. `/index.ts`. */
  entryPath: string;
  /** Every transpilable file's compiled JS, keyed by path. */
  files: Record<string, string>;
  /** Import specifier (e.g. `./utils`, `./utils.ts`) → path key into `files`, for non-entry files. */
  importSpecifiers: Record<string, string>;
  /** Raw content of `/index.html`, if the project has one — used as the preview document as-is. */
  htmlContent: string | null;
}

function escapeForInlineScript(text: string): string {
  return text.replace(/<\/script/gi, '<\\/script');
}

function buildBootstrap(
  input: Pick<HarnessInput, 'entryPath' | 'files' | 'importSpecifiers'>,
): string {
  const filesJson = escapeForInlineScript(JSON.stringify(input.files));
  const specifiersJson = escapeForInlineScript(JSON.stringify(input.importSpecifiers));
  const entryPathJson = JSON.stringify(input.entryPath);

  return `
var __cpFiles = ${filesJson};
var __cpUrls = {};
for (var __cpPath in __cpFiles) {
  __cpUrls[__cpPath] = URL.createObjectURL(new Blob([__cpFiles[__cpPath]], { type: 'text/javascript' }));
}
var __cpImportMap = {};
var __cpSpecifiers = ${specifiersJson};
for (var __cpSpecifier in __cpSpecifiers) {
  __cpImportMap[__cpSpecifier] = __cpUrls[__cpSpecifiers[__cpSpecifier]];
}
var __cpEntryUrl = __cpUrls[${entryPathJson}];
document.write(
  '<scr' + 'ipt type="importmap">' + JSON.stringify({ imports: __cpImportMap }) + '</scr' + 'ipt>' +
  '<scr' + 'ipt type="module" src="' + __cpEntryUrl + '"></scr' + 'ipt>'
);
`;
}

export function buildRuntimeHarness(input: HarnessInput): string {
  const setupTag = `<script>${RUNTIME_SETUP}</script>`;
  const bootstrapTag = `<script>${buildBootstrap(input)}</script>`;
  const headTags = `${setupTag}${bootstrapTag}`;

  if (input.htmlContent === null) {
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    ${headTags}
  </head>
  <body></body>
</html>`;
  }

  // The runtime setup + bootstrap must run before the module script they `document.write()` is
  // reached, so they're inserted right after <head> (or prepended if there's no <head> at all).
  const html = input.htmlContent;
  return /<head[^>]*>/i.test(html)
    ? html.replace(/<head[^>]*>/i, (match) => `${match}${headTags}`)
    : `${headTags}${html}`;
}
