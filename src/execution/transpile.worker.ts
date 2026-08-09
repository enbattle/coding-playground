import * as ts from 'typescript';
import type { CompilerOptionValues, TargetOption } from '../settings/compilerOptions';

/**
 * Runs entirely off the main thread. Unrelated to Monaco's own TS language-service worker
 * (src/editor/monacoEnvironment.ts) — this one only transpiles for execution (ADR 0002), it does
 * no type-checking of its own. Real diagnostics come from Monaco's live squiggles; the diagnostics
 * this worker reports are only the syntactic errors `transpileModule` happens to surface.
 */

export interface TranspileRequest {
  id: number;
  source: string;
  options: CompilerOptionValues;
}

export interface TranspileResponse {
  id: number;
  code: string;
  diagnostics: string[];
}

// This worker uses the real `typescript` package's full enums (unlike Monaco's trimmed ones — see
// ADR 0007), but is still restricted to the curated option set so behavior matches what the user
// saw in the editor's live diagnostics.
const TARGET_MAP: Record<TargetOption, ts.ScriptTarget> = {
  ES5: ts.ScriptTarget.ES5,
  ES2015: ts.ScriptTarget.ES2015,
  ES2017: ts.ScriptTarget.ES2017,
  ES2019: ts.ScriptTarget.ES2019,
  ES2020: ts.ScriptTarget.ES2020,
  ESNext: ts.ScriptTarget.ESNext,
};

self.onmessage = (event: MessageEvent<TranspileRequest>) => {
  const { id, source, options } = event.data;

  const result = ts.transpileModule(source, {
    compilerOptions: {
      // Fixed regardless of user choice — see ADR 0007. Execution hard-requires ESM output.
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      isolatedModules: true,
      target: TARGET_MAP[options.target],
      strict: options.strict,
      esModuleInterop: options.esModuleInterop,
      experimentalDecorators: options.experimentalDecorators,
      noUnusedLocals: options.noUnusedLocals,
      noUnusedParameters: options.noUnusedParameters,
    },
    reportDiagnostics: true,
  });

  const diagnostics = (result.diagnostics ?? []).map((diagnostic) =>
    ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
  );

  const response: TranspileResponse = { id, code: result.outputText, diagnostics };
  self.postMessage(response);
};
