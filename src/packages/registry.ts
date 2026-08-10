/**
 * Curated, pinned-version package allowlist (ADR 0003) — the only packages a user can `import`.
 * Each entry drives three things independently: the execution import map
 * (src/execution/sandboxHarness.ts), Monaco IntelliSense (src/editor/monacoPackageTypes.ts), and
 * the Packages panel UI (PackagesPanel.tsx). Adding a package means adding one entry here — verify
 * it resolves on esm.sh first (`curl -sI https://esm.sh/<name>@<version>`, check for a 200 and an
 * `x-typescript-types` header) before pinning the version.
 */

export interface PackageDefinition {
  name: string;
  version: string;
  description: string;
  docsUrl: string;
}

export const PACKAGE_REGISTRY: PackageDefinition[] = [
  {
    name: 'zod',
    version: '4.4.3',
    description: 'TypeScript-first schema validation with static type inference.',
    docsUrl: 'https://zod.dev',
  },
  {
    name: 'date-fns',
    version: '4.4.0',
    description: 'Modern date utility library — small, pure, composable functions.',
    docsUrl: 'https://date-fns.org',
  },
  {
    name: 'nanoid',
    version: '6.0.1',
    description: 'Tiny, secure, URL-friendly unique string ID generator.',
    docsUrl: 'https://github.com/ai/nanoid',
  },
  {
    name: 'immer',
    version: '11.1.16',
    description: 'Create immutable state by mutating a draft, via structural sharing.',
    docsUrl: 'https://immerjs.github.io/immer/',
  },
  {
    name: 'lodash-es',
    version: '4.18.1',
    description: 'Lodash, exported as ES modules — utilities for common programming tasks.',
    docsUrl: 'https://lodash.com',
  },
  {
    name: 'rxjs',
    version: '7.8.2',
    description: 'Reactive Extensions for JavaScript — compose async/event-based programs.',
    docsUrl: 'https://rxjs.dev',
  },
];

function moduleUrl(name: string, version: string): string {
  return `https://esm.sh/${name}@${version}`;
}

/** Bare specifier (package name) → esm.sh module URL, for the execution import map. */
export const PACKAGE_IMPORT_MAP: Record<string, string> = Object.fromEntries(
  PACKAGE_REGISTRY.map((pkg) => [pkg.name, moduleUrl(pkg.name, pkg.version)]),
);
