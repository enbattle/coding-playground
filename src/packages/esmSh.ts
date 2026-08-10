/**
 * Fetches a package's TypeScript types from esm.sh for Monaco IntelliSense.
 *
 * esm.sh exposes the entry .d.ts location via an `X-TypeScript-Types` response header on the JS
 * module itself (confirmed present and CORS-exposed via `access-control-expose-headers`). That
 * entry file is rarely self-contained — it commonly re-exports from sibling files via relative
 * specifiers (`export * from "./lib/index.d.ts"`), and for some packages (e.g. lodash-es) the
 * types are hosted under a completely different path than the JS module (a `@types/*` package).
 * So this recursively crawls relative imports/exports starting from the entry file, up to a cap.
 *
 * The trick that keeps Monaco's module resolution consistent with what actually got fetched:
 * resolve each relative specifier against BOTH the real fetch URL and a parallel virtual
 * `file:///node_modules/<name>/...` URL, using the same `new URL(specifier, base)` call for each.
 * Since URL relative-resolution is a pure structural operation, applying it twice with different
 * bases keeps the two URL spaces in lockstep — no manual path-prefix rewriting needed, and it
 * doesn't matter that the real URLs may not share a common package-root prefix (lodash-es's case).
 */

const MAX_FILES_PER_PACKAGE = 30;

function extractRelativeSpecifiers(content: string): string[] {
  const specifiers = new Set<string>();
  const pattern = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;
  for (const match of content.matchAll(pattern)) {
    const specifier = match[1];
    if (specifier.startsWith('.')) specifiers.add(specifier);
  }
  return [...specifiers];
}

async function resolveEntryTypesUrl(moduleUrl: string): Promise<string | null> {
  try {
    const response = await fetch(moduleUrl, { method: 'HEAD' });
    return response.headers.get('X-TypeScript-Types');
  } catch {
    return null;
  }
}

/** Returns virtual URI → file content for every `.d.ts`/`.d.cts` file discovered, entry first. */
export async function fetchPackageTypes(
  name: string,
  moduleUrl: string,
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const entryTypesUrl = await resolveEntryTypesUrl(moduleUrl);
  if (!entryTypesUrl) return results;

  const virtualEntry = `file:///node_modules/${name}/index.d.ts`;
  const queue: [real: string, virtual: string][] = [[entryTypesUrl, virtualEntry]];
  const visitedReal = new Set<string>();

  while (queue.length > 0 && results.size < MAX_FILES_PER_PACKAGE) {
    const [realUrl, virtualUrl] = queue.shift()!;
    if (visitedReal.has(realUrl)) continue;
    visitedReal.add(realUrl);

    let content: string;
    try {
      const response = await fetch(realUrl);
      if (!response.ok) continue;
      content = await response.text();
    } catch {
      continue;
    }

    results.set(virtualUrl, content);

    for (const specifier of extractRelativeSpecifiers(content)) {
      const nextReal = new URL(specifier, realUrl).toString();
      if (visitedReal.has(nextReal)) continue;
      const nextVirtual = new URL(specifier, virtualUrl).toString();
      queue.push([nextReal, nextVirtual]);
    }
  }

  return results;
}
