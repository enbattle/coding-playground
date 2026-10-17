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
/**
 * A runaway guard, not a budget. Measured against the curated packages: lodash-es needs ~305
 * files, date-fns ~258, rxjs ~175, zod ~80 — the old cap of 30 silently dropped most of their
 * exports (e.g. date-fns' `format`), which surfaced as false "has no exported member" errors.
 */
const MAX_FILES_PER_PACKAGE = 1000;

function extractRelativeSpecifiers(content: string): string[] {
  const specifiers = new Set<string>();
  const pattern = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;
  for (const match of content.matchAll(pattern)) {
    const specifier = match[1];
    if (specifier.startsWith('.')) specifiers.add(specifier);
  }
  return [...specifiers];
}

async function resolveEntryTypesUrl(moduleUrl: string, fetchImpl: typeof fetch) {
  try {
    const response = await fetchImpl(moduleUrl, { method: 'HEAD' });
    return response.headers.get('X-TypeScript-Types');
  } catch {
    return null;
  }
}

async function fetchText(url: string, fetchImpl: typeof fetch): Promise<string | null> {
  try {
    const response = await fetchImpl(url);
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}

/**
 * Returns virtual URI → file content for every `.d.ts`/`.d.cts` file discovered, entry first.
 * Fetches one level of the re-export graph at a time, in parallel — a few hundred sequential
 * round trips would take far too long for large packages. `fetchImpl` is injectable so the crawl
 * can be unit-tested against a fake esm.sh.
 */
export async function fetchPackageTypes(
  name: string,
  moduleUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const entryTypesUrl = await resolveEntryTypesUrl(moduleUrl, fetchImpl);
  if (!entryTypesUrl) return results;

  let level: [real: string, virtual: string][] = [
    [entryTypesUrl, `file:///node_modules/${name}/index.d.ts`],
  ];
  const visitedReal = new Set([entryTypesUrl]);

  while (level.length > 0) {
    const fetched = await Promise.all(
      level.map(async ([realUrl, virtualUrl]) => ({
        realUrl,
        virtualUrl,
        content: await fetchText(realUrl, fetchImpl),
      })),
    );

    const next: typeof level = [];
    for (const { realUrl, virtualUrl, content } of fetched) {
      if (content === null) continue;
      results.set(virtualUrl, content);
      for (const specifier of extractRelativeSpecifiers(content)) {
        const nextReal = new URL(specifier, realUrl).toString();
        if (visitedReal.has(nextReal)) continue;
        visitedReal.add(nextReal);
        next.push([nextReal, new URL(specifier, virtualUrl).toString()]);
      }
    }
    level = next.slice(0, Math.max(0, MAX_FILES_PER_PACKAGE - results.size));
  }

  return results;
}
