// `from 'x'`, `import 'x'`, and `import('x')`, with either quote style. A specifier that only
// appears in a comment or string still matches — harmless, it just loads that package's types.
const SPECIFIER_PATTERN = /(?:\bfrom\s*|\bimport\s*\(?\s*)(['"])([^'"\n]+)\1/g;

/**
 * Which of `packageNames` the source imports, each listed once in first-seen order. Exact names
 * only: subpaths (`lodash-es/debounce`) aren't in the import map, so they don't run either.
 */
export function findImportedPackages(source: string, packageNames: string[]): string[] {
  const found = new Set<string>();
  for (const match of source.matchAll(SPECIFIER_PATTERN)) {
    if (packageNames.includes(match[2])) found.add(match[2]);
  }
  return [...found];
}
