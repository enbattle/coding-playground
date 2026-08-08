import { create } from 'zustand';
import { DEFAULT_COMPILER_OPTIONS, type CompilerOptionValues } from './compilerOptions';

interface CompilerOptionsState extends CompilerOptionValues {
  setOption: <K extends keyof CompilerOptionValues>(key: K, value: CompilerOptionValues[K]) => void;
}

// Not persisted yet — Phase 7's settings system decides whether/how this joins the unified,
// versioned localStorage schema. Don't bolt on ad hoc persistence here in the meantime.
export const useCompilerOptionsStore = create<CompilerOptionsState>()((set) => ({
  ...DEFAULT_COMPILER_OPTIONS,
  setOption: (key, value) => set({ [key]: value } as Partial<CompilerOptionsState>),
}));

export function getCompilerOptionValues(): CompilerOptionValues {
  const { setOption: _setOption, ...values } = useCompilerOptionsStore.getState();
  return values;
}
