import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import TypeScriptWorker from 'monaco-editor/languages/features/typescript/ts.worker?worker';

/**
 * Monaco needs to know how to spin up its background workers (one for generic editor features,
 * one for the TypeScript/JavaScript language service). This must run before the first
 * `monaco.editor.create()` call — imported for its side effect at the top of MonacoEditor.tsx.
 *
 * This is Monaco's own internal language-service worker, used for editor intellisense
 * (diagnostics, hover, completions) — separate from and unrelated to the execution transpile
 * worker in src/execution/, which is a plain `typescript` package worker with no Monaco
 * dependency, used only to produce the JS that actually runs when the user hits Run (ADR 0002).
 */
self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === 'typescript' || label === 'javascript') {
      return new TypeScriptWorker();
    }
    return new EditorWorker();
  },
};
