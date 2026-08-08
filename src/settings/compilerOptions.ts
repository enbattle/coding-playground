/**
 * The curated, playground-facing subset of tsconfig `compilerOptions` — plain string/boolean
 * values, not tied to either Monaco's or the real `typescript` package's enums. Each consumer
 * (src/editor/monacoCompilerOptions.ts for live diagnostics, src/execution/transpile.worker.ts for
 * execution) maps these strings to its own library's enum independently. See
 * docs/decisions/0007-compiler-options-are-curated-and-module-is-fixed.md for why `module` isn't
 * here at all, and why this list is curated rather than exhaustive.
 */

export type TargetOption = 'ES5' | 'ES2015' | 'ES2017' | 'ES2019' | 'ES2020' | 'ESNext';
export type JsxOption = 'none' | 'preserve' | 'react-jsx';

export interface CompilerOptionValues {
  target: TargetOption;
  jsx: JsxOption;
  strict: boolean;
  esModuleInterop: boolean;
  experimentalDecorators: boolean;
  noUnusedLocals: boolean;
  noUnusedParameters: boolean;
}

export const DEFAULT_COMPILER_OPTIONS: CompilerOptionValues = {
  target: 'ESNext',
  jsx: 'none',
  strict: true,
  esModuleInterop: true,
  experimentalDecorators: false,
  noUnusedLocals: false,
  noUnusedParameters: false,
};

export const TARGET_OPTIONS: TargetOption[] = [
  'ES5',
  'ES2015',
  'ES2017',
  'ES2019',
  'ES2020',
  'ESNext',
];

export const JSX_OPTIONS: { value: JsxOption; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'preserve', label: 'Preserve' },
  { value: 'react-jsx', label: 'React JSX' },
];
