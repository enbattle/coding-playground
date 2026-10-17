import { typescriptDefaults } from 'monaco-editor/languages/features/typescript/register';
import { useEditorStore } from './store';
import { PACKAGE_REGISTRY, PACKAGE_IMPORT_MAP } from '../packages/registry';
import { fetchPackageTypes } from '../packages/esmSh';
import { findImportedPackages } from '../packages/packageImports';

const PACKAGE_NAMES = PACKAGE_REGISTRY.map((pkg) => pkg.name);

/**
 * Loads a curated package's types (see src/packages/esmSh.ts) the first time the code imports it,
 * and registers them with Monaco's TS language service, so `import { z } from 'zod'` gets real
 * IntelliSense without the user doing anything. On demand rather than all at startup: the full
 * type graphs of all six packages are ~800 files, and most sessions import none of them.
 *
 * Deliberately best-effort: this is a nice-to-have layered on top of execution (which works
 * independently — compiled imports point straight at esm.sh), not a prerequisite for it. A slow
 * or unreachable esm.sh degrades to "no IntelliSense for that package," never blocks typing or
 * running code. A failed load is retried on the next edit that still imports the package.
 */
export function syncMonacoPackageTypes(): void {
  const requested = new Set<string>();
  const loadedLibs = new Map<string, string>();

  const load = (name: string) => {
    requested.add(name);
    fetchPackageTypes(name, PACKAGE_IMPORT_MAP[name])
      .then((files) => {
        if (files.size === 0) {
          requested.delete(name);
          return;
        }
        for (const [virtualUri, content] of files) loadedLibs.set(virtualUri, content);
        // One batch update, not one addExtraLib per file: each extra-lib change makes Monaco
        // revalidate every open model, and a package can bring hundreds of files.
        typescriptDefaults.setExtraLibs(
          [...loadedLibs].map(([filePath, content]) => ({ filePath, content })),
        );
      })
      .catch(() => requested.delete(name));
  };

  const loadImported = (source: string) => {
    for (const name of findImportedPackages(source, PACKAGE_NAMES)) {
      if (!requested.has(name)) load(name);
    }
  };

  loadImported(useEditorStore.getState().content);
  useEditorStore.subscribe((state) => loadImported(state.content));
}
