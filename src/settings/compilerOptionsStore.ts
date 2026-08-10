import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_COMPILER_OPTIONS, type CompilerOptionValues } from './compilerOptions';
import { SETTINGS_SCHEMA_VERSION } from './schemaVersion';

interface CompilerOptionsState extends CompilerOptionValues {
  setOption: <K extends keyof CompilerOptionValues>(key: K, value: CompilerOptionValues[K]) => void;
}

export const useCompilerOptionsStore = create<CompilerOptionsState>()(
  persist(
    (set) => ({
      ...DEFAULT_COMPILER_OPTIONS,
      setOption: (key, value) => set({ [key]: value } as Partial<CompilerOptionsState>),
    }),
    {
      name: 'coding-playground:compiler-options',
      version: SETTINGS_SCHEMA_VERSION,
      migrate: (persistedState) => persistedState as CompilerOptionsState,
    },
  ),
);

export function getCompilerOptionValues(): CompilerOptionValues {
  const { setOption: _setOption, ...values } = useCompilerOptionsStore.getState();
  return values;
}
