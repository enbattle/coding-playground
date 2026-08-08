import * as ts from 'typescript'

/**
 * Runs entirely off the main thread. Unrelated to Monaco's own TS language-service worker
 * (src/editor/monacoEnvironment.ts) — this one only transpiles for execution (ADR 0002), it does
 * no type-checking of its own. Real diagnostics come from Monaco's live squiggles; the diagnostics
 * this worker reports are only the syntactic errors `transpileModule` happens to surface.
 */

export interface TranspileRequest {
  id: number
  source: string
}

export interface TranspileResponse {
  id: number
  code: string
  diagnostics: string[]
}

self.onmessage = (event: MessageEvent<TranspileRequest>) => {
  const { id, source } = event.data

  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      esModuleInterop: true,
      isolatedModules: true,
    },
    reportDiagnostics: true,
  })

  const diagnostics = (result.diagnostics ?? []).map((diagnostic) =>
    ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
  )

  const response: TranspileResponse = { id, code: result.outputText, diagnostics }
  self.postMessage(response)
}
