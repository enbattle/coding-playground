import { describe, expect, it } from 'vitest';
import { DEFAULT_COMPILER_OPTIONS } from '../settings/compilerOptions';
import { transpileSource } from './transpile';

const PACKAGE_URLS = { zod: 'https://esm.sh/zod@4.4.3' };

function compile(source: string) {
  return transpileSource(source, DEFAULT_COMPILER_OPTIONS, PACKAGE_URLS);
}

describe('transpileSource', () => {
  it('compiles TypeScript to JavaScript', () => {
    const { code, diagnostics } = compile('const n: number = 1;\nconsole.log(n);');
    expect(code).toContain('const n = 1;');
    expect(diagnostics).toEqual([]);
  });

  // User code runs in a worker, where import maps don't apply — curated packages have to be
  // addressed by their full URL in the emitted code itself.
  it.each([
    ["import { z } from 'zod';\nconsole.log(z);", 'import { z } from "https://esm.sh/zod@4.4.3"'],
    ["export * from 'zod';", 'export * from "https://esm.sh/zod@4.4.3"'],
    ["const m = await import('zod');\nconsole.log(m);", 'import("https://esm.sh/zod@4.4.3")'],
  ])('rewrites curated package specifiers in %j', (source, expected) => {
    expect(compile(source).code).toContain(expected);
  });

  it('leaves non-curated and relative specifiers alone', () => {
    const { code } = compile(
      "import pad from 'left-pad';\nimport { x } from './local';\nconsole.log(pad, x);",
    );
    expect(code).toContain("from 'left-pad'");
    expect(code).toContain("from './local'");
  });

  it('still elides type-only imports', () => {
    const { code } = compile("import type { ZodType } from 'zod';\nlet t: ZodType | null = null;");
    expect(code).not.toContain('import');
  });

  it('reports syntax errors as diagnostics', () => {
    expect(compile('const = ;').diagnostics.length).toBeGreaterThan(0);
  });
});
