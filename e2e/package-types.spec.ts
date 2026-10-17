import { expect, test } from '@playwright/test';
import { setEditorContent, waitForMonaco } from './helpers';

// Large packages split their types over hundreds of .d.ts files (lodash-es ~305, date-fns ~258,
// rxjs ~175, zod ~80). Every common export below lives in a file a capped crawl never reached,
// which showed up as a false "has no exported member" error on code that runs fine.
const IMPORTS: [packageName: string, code: string][] = [
  ['date-fns', "import { format } from 'date-fns';\nconsole.log(format(new Date(0), 'yyyy'));\n"],
  [
    'lodash-es',
    "import { debounce } from 'lodash-es';\nconsole.log(typeof debounce(() => 1, 10));\n",
  ],
  [
    'rxjs',
    "import { of, map } from 'rxjs';\nof(1).pipe(map((n) => n + 1)).subscribe(console.log);\n",
  ],
  ['zod', "import { z } from 'zod';\nconsole.log(z.string().parse('ok'));\n"],
];

// One deliberate error: seeing exactly "Problems (1)" proves diagnostics actually ran, where a bare
// "Problems" would also match before Monaco has computed anything at all. It's logged so it doesn't
// also produce an "unused variable" hint.
const KNOWN_ERROR = "const deliberate: number = 'not a number';\nconsole.log(deliberate);\n";

test.describe('package types', () => {
  for (const [packageName, code] of IMPORTS) {
    test(`a common ${packageName} import type-checks cleanly`, async ({ page }) => {
      await page.goto('/');
      await waitForMonaco(page);

      await setEditorContent(page, code + KNOWN_ERROR);

      // Types arrive asynchronously, so a transient "Cannot find module" is expected — it has to
      // clear once they load, leaving only the deliberate error.
      const problemsTab = page.getByRole('button', { name: 'Problems (1)', exact: true });
      await expect(problemsTab).toBeVisible({ timeout: 30_000 });
      await problemsTab.click();
      await expect(
        page.getByText("Type 'string' is not assignable to type 'number'."),
      ).toBeVisible();
    });
  }
});
