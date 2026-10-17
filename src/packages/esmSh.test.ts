import { describe, expect, it } from 'vitest';
import { fetchPackageTypes } from './esmSh';

const MODULE_URL = 'https://esm.sh/pkg@1.0.0';
const TYPES_ROOT = 'https://esm.sh/pkg@1.0.0/types';

/** A fake esm.sh: the module URL answers HEAD with the entry types URL, files answer GET. */
function fakeFetch(files: Record<string, string>, entry = `${TYPES_ROOT}/index.d.ts`) {
  const requested: string[] = [];
  const impl = async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    requested.push(url);
    if (url === MODULE_URL && init?.method === 'HEAD') {
      return new Response(null, { headers: { 'X-TypeScript-Types': entry } });
    }
    return url in files ? new Response(files[url]) : new Response('not found', { status: 404 });
  };
  return { impl: impl as typeof fetch, requested };
}

describe('fetchPackageTypes', () => {
  // date-fns needs ~258 files, lodash-es ~305: a cap of 30 silently dropped most of their exports.
  it('follows the whole re-export graph, well past 30 files', async () => {
    const names = Array.from({ length: 300 }, (_, index) => `fn${index}`);
    const files: Record<string, string> = {
      [`${TYPES_ROOT}/index.d.ts`]: names
        .map((name) => `export * from "./${name}.d.ts";`)
        .join('\n'),
    };
    for (const name of names)
      files[`${TYPES_ROOT}/${name}.d.ts`] = `export declare function ${name}(): void;`;

    const result = await fetchPackageTypes('pkg', MODULE_URL, fakeFetch(files).impl);

    expect(result.size).toBe(301);
    expect(result.get('file:///node_modules/pkg/fn299.d.ts')).toContain('fn299');
  });

  it('maps nested relative paths into the parallel virtual tree', async () => {
    const files = {
      [`${TYPES_ROOT}/index.d.ts`]: 'export * from "./lib/a.d.ts";',
      [`${TYPES_ROOT}/lib/a.d.ts`]: 'import type { B } from "../shared/b.d.ts";',
      [`${TYPES_ROOT}/shared/b.d.ts`]: 'export type B = 1;',
    };
    const result = await fetchPackageTypes('pkg', MODULE_URL, fakeFetch(files).impl);
    expect([...result.keys()]).toEqual([
      'file:///node_modules/pkg/index.d.ts',
      'file:///node_modules/pkg/lib/a.d.ts',
      'file:///node_modules/pkg/shared/b.d.ts',
    ]);
  });

  it('fetches each file once, even with import cycles', async () => {
    const files = {
      [`${TYPES_ROOT}/index.d.ts`]: 'export * from "./a.d.ts";\nexport * from "./b.d.ts";',
      [`${TYPES_ROOT}/a.d.ts`]: 'export * from "./b.d.ts";',
      [`${TYPES_ROOT}/b.d.ts`]: 'export * from "./a.d.ts";',
    };
    const fake = fakeFetch(files);
    await fetchPackageTypes('pkg', MODULE_URL, fake.impl);
    expect(fake.requested.filter((url) => url.endsWith('/a.d.ts'))).toHaveLength(1);
  });

  it('skips files that fail to fetch and keeps the rest', async () => {
    const files = {
      [`${TYPES_ROOT}/index.d.ts`]: 'export * from "./missing.d.ts";\nexport * from "./ok.d.ts";',
      [`${TYPES_ROOT}/ok.d.ts`]: 'export type Ok = 1;',
    };
    const result = await fetchPackageTypes('pkg', MODULE_URL, fakeFetch(files).impl);
    expect([...result.keys()]).toContain('file:///node_modules/pkg/ok.d.ts');
  });
});
