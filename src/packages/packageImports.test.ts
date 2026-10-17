import { describe, expect, it } from 'vitest';
import { findImportedPackages } from './packageImports';

const CURATED = ['zod', 'date-fns', 'lodash-es', 'rxjs'];

describe('findImportedPackages', () => {
  it.each([
    ["import { z } from 'zod';", ['zod']],
    ['import * as rx from "rxjs";', ['rxjs']],
    ["import 'date-fns';", ['date-fns']],
    ["export * from 'zod';", ['zod']],
    ["const m = await import('lodash-es');", ['lodash-es']],
    ["import {\n  debounce,\n  throttle,\n} from 'lodash-es';", ['lodash-es']],
  ])('finds the curated package in %j', (source, expected) => {
    expect(findImportedPackages(source, CURATED)).toEqual(expected);
  });

  it('lists each package once, in first-seen order', () => {
    const source =
      "import { of } from 'rxjs';\nimport { z } from 'zod';\nimport { map } from 'rxjs';";
    expect(findImportedPackages(source, CURATED)).toEqual(['rxjs', 'zod']);
  });

  it('ignores non-curated packages and subpaths the import map never resolves', () => {
    const source = "import pad from 'left-pad';\nimport debounce from 'lodash-es/debounce';";
    expect(findImportedPackages(source, CURATED)).toEqual([]);
  });
});
