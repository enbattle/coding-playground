import { useCallback, useState } from 'react';
import { ENTRY_PATH, isTranspilable, useFilesStore } from '../files/store';
import { getCompilerOptionValues } from '../settings/compilerOptionsStore';
import { transpile } from './transpileClient';
import { useExecutionStore } from './store';
import { rewriteRelativeImportsToBareSpecifiers } from './rewriteRelativeImports';
import type { HarnessInput } from './sandboxHarness';

/** Bare-specifier form matching what rewriteRelativeImportsToBareSpecifiers produces (ADR 0006). */
function specifiersFor(path: string): string[] {
  const withoutLeadingSlash = path.slice(1);
  const dot = withoutLeadingSlash.lastIndexOf('.');
  const base = withoutLeadingSlash.slice(0, dot);
  const ext = withoutLeadingSlash.slice(dot);
  // Map both extension-less and extension-ful specifiers — TypeScript convention is to omit the
  // extension, but not everyone writes it that way.
  return [base, `${base}${ext}`];
}

export function useRunner() {
  const [runId, setRunId] = useState(0);
  const [harnessInput, setHarnessInput] = useState<HarnessInput | null>(null);

  const run = useCallback(async () => {
    const { files } = useFilesStore.getState();
    const store = useExecutionStore.getState();
    store.clear();
    store.setStatus('running');

    const compilerOptions = getCompilerOptionValues();
    const tsFiles = Object.values(files).filter((file) => isTranspilable(file.path));
    const transpiled = await Promise.all(
      tsFiles.map(async (file) => ({
        file,
        result: await transpile(file.content, compilerOptions),
      })),
    );

    for (const { file, result } of transpiled) {
      for (const diagnostic of result.diagnostics) {
        store.append({ level: 'error', text: `${file.path}: ${diagnostic}` });
      }
    }

    const compiled: Record<string, string> = {};
    const importSpecifiers: Record<string, string> = {};
    for (const { file, result } of transpiled) {
      compiled[file.path] = rewriteRelativeImportsToBareSpecifiers(result.code);
      if (file.path !== ENTRY_PATH) {
        for (const specifier of specifiersFor(file.path)) importSpecifiers[specifier] = file.path;
      }
    }

    if (compiled[ENTRY_PATH] !== undefined) {
      setHarnessInput({
        entryPath: ENTRY_PATH,
        files: compiled,
        importSpecifiers,
        htmlContent: files['/index.html']?.content ?? null,
      });
      setRunId((id) => id + 1);
    }

    store.setStatus('idle');
  }, []);

  return { runId, harnessInput, run };
}
