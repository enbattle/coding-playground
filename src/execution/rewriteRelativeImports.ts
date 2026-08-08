/**
 * Rewrites `./name` import specifiers to bare `name` specifiers in compiled JS.
 *
 * Why this exists (ADR 0006): the entry file loads via `<script type="module" src="blob:...">`,
 * and blob: URLs are opaque/non-hierarchical — the browser cannot resolve a *relative* specifier
 * like `./utils` against a blob: URL referrer at all ("Invalid relative url or base scheme isn't
 * hierarchical"), so it never even reaches the import map lookup. Bare specifiers (no leading
 * `./`) skip that referrer-relative resolution step entirely and go straight to the import map,
 * which works regardless of the referrer's URL scheme. So every local cross-file import gets
 * rewritten to bare form here, and the import map (built in useRunner.ts) uses matching bare keys.
 *
 * Only handles the flat, no-subdirectory file model this project supports (ADR: files store has no
 * nested paths) — `./name` and `./name.ext`, not `../` or deeper paths.
 */
export function rewriteRelativeImportsToBareSpecifiers(code: string): string {
  return code
    .replace(/\bfrom(\s+)(['"])\.\/([^'"]+)\2/g, 'from$1$2$3$2')
    .replace(/\bimport(\s+)(['"])\.\/([^'"]+)\2/g, 'import$1$2$3$2')
    .replace(/\bimport(\s*\(\s*)(['"])\.\/([^'"]+)\2/g, 'import$1$2$3$2');
}
