import { typescriptDefaults } from 'monaco-editor/languages/features/typescript/register';
import { PACKAGE_REGISTRY, PACKAGE_IMPORT_MAP } from '../packages/registry';
import { fetchPackageTypes } from '../packages/esmSh';

/**
 * Fires once at editor setup — fetches each curated package's types from esm.sh (see
 * src/packages/esmSh.ts) and registers them with Monaco's TS language service via `addExtraLib`,
 * so `import { z } from 'zod'` gets real IntelliSense without the user doing anything.
 *
 * Deliberately fire-and-forget and per-package isolated: this is a nice-to-have layered on top of
 * execution (which works independently via the import map in sandboxHarness.ts), not a
 * prerequisite for it — a slow or unreachable esm.sh should degrade to "no intellisense for that
 * package," never block typing or running code.
 */
export function syncMonacoPackageTypes(): void {
  for (const pkg of PACKAGE_REGISTRY) {
    const moduleUrl = PACKAGE_IMPORT_MAP[pkg.name];
    fetchPackageTypes(pkg.name, moduleUrl)
      .then((files) => {
        for (const [virtualUri, content] of files) {
          typescriptDefaults.addExtraLib(content, virtualUri);
        }
      })
      .catch(() => {
        // Network hiccup or an unexpected response shape — that package just won't have
        // IntelliSense this session. Not worth surfacing to the user.
      });
  }
}
