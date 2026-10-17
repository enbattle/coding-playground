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

type BooleanOptionKey = Exclude<keyof CompilerOptionValues, 'target'>;

const BOOLEAN_OPTION_KEYS = Object.keys(DEFAULT_COMPILER_OPTIONS).filter(
  (key) => key !== 'target',
) as BooleanOptionKey[];

/**
 * The one gate for compiler options arriving from outside data — share links, imported settings
 * files, saved-playground snapshots. Keeps only known, own keys whose values are valid (a `target`
 * from TARGET_OPTIONS, real booleans for everything else) and drops the rest, so a malformed or
 * hand-edited payload can never put a value into the store that Monaco and the transpile worker
 * have no mapping for. Never throws.
 */
export function pickCompilerOptions(input: unknown): Partial<CompilerOptionValues> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return {};
  const source = input as Record<string, unknown>;
  const picked: Partial<CompilerOptionValues> = {};

  if (Object.hasOwn(source, 'target') && TARGET_OPTIONS.includes(source.target as TargetOption)) {
    picked.target = source.target as TargetOption;
  }
  for (const key of BOOLEAN_OPTION_KEYS) {
    if (Object.hasOwn(source, key) && typeof source[key] === 'boolean') {
      picked[key] = source[key];
    }
  }
  return picked;
}
