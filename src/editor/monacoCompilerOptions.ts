import {
  typescriptDefaults,
  ScriptTarget,
  ModuleKind,
  ModuleResolutionKind,
  JsxEmit,
} from 'monaco-editor/languages/features/typescript/register';
import { useCompilerOptionsStore } from '../settings/compilerOptionsStore';
import type { JsxOption, TargetOption } from '../settings/compilerOptions';

// Monaco's trimmed ScriptTarget enum tops out at ESNext — see ADR 0007 for why the panel's option
// set is restricted to values both this and the execution worker's real `typescript` package share.
const TARGET_MAP: Record<TargetOption, ScriptTarget> = {
  ES5: ScriptTarget.ES5,
  ES2015: ScriptTarget.ES2015,
  ES2017: ScriptTarget.ES2017,
  ES2019: ScriptTarget.ES2019,
  ES2020: ScriptTarget.ES2020,
  ESNext: ScriptTarget.ESNext,
};

const JSX_MAP: Record<JsxOption, JsxEmit> = {
  none: JsxEmit.None,
  preserve: JsxEmit.Preserve,
  'react-jsx': JsxEmit.ReactJSX,
};

/**
 * Applies the current compiler-options store to Monaco's live diagnostics, then keeps it in sync.
 *
 * No manual revalidation trigger is needed here: Monaco's own DiagnosticsAdapter
 * (languageFeatures.js) subscribes to `typescriptDefaults.onDidChange` itself and recomputes every
 * open model's diagnostics whenever `setCompilerOptions` is called — confirmed by hand against a
 * real browser (toggling `strict` live-changed a diagnostic's severity and message with no
 * re-edit). Worth stating explicitly since it's easy to assume otherwise from reading only the
 * per-model `onDidChangeContent` listener and miss the separate defaults-level subscription.
 */
export function syncMonacoCompilerOptions(): void {
  const apply = () => {
    const options = useCompilerOptionsStore.getState();
    typescriptDefaults.setCompilerOptions({
      target: TARGET_MAP[options.target],
      // Fixed regardless of user choice — see ADR 0007. This API predates TS's 'bundler'
      // resolution mode; 'NodeJs' is the closest available option in Monaco's trimmed enum.
      module: ModuleKind.ESNext,
      moduleResolution: ModuleResolutionKind.NodeJs,
      jsx: JSX_MAP[options.jsx],
      strict: options.strict,
      esModuleInterop: options.esModuleInterop,
      experimentalDecorators: options.experimentalDecorators,
      noUnusedLocals: options.noUnusedLocals,
      noUnusedParameters: options.noUnusedParameters,
      skipLibCheck: true,
    });
  };

  apply();
  useCompilerOptionsStore.subscribe(apply);
}
