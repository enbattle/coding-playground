/**
 * The curated, playground-facing subset of tsconfig `compilerOptions` — plain string/boolean
 * values, not tied to either Monaco's or the real `typescript` package's enums. Each consumer
 * (src/editor/monacoCompilerOptions.ts for live diagnostics, src/execution/transpile.worker.ts for
 * execution) maps these strings to its own library's enum independently. See
 * docs/decisions/0007-compiler-options-are-curated-and-module-is-fixed.md for why `module` isn't
 * here at all, and why this list is curated rather than exhaustive. `jsx` was cut in ADR 0008 along
 * with multi-file/`.tsx` support — there's no way to have JSX syntax without a `.tsx` file, so the
 * option had no observable effect and was just confusing dead UI.
 */

export type TargetOption = 'ES5' | 'ES2015' | 'ES2017' | 'ES2019' | 'ES2020' | 'ESNext';

export interface CompilerOptionValues {
  target: TargetOption;
  strict: boolean;
  esModuleInterop: boolean;
  experimentalDecorators: boolean;
  noUnusedLocals: boolean;
  noUnusedParameters: boolean;
}

export const DEFAULT_COMPILER_OPTIONS: CompilerOptionValues = {
  target: 'ESNext',
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
