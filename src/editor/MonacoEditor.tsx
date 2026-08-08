import './monacoEnvironment';
import * as monaco from 'monaco-editor/editor/editor.api';
// Registers the 'typescript' language id + Monarch tokenizer with Monaco's basic language registry.
import 'monaco-editor/languages/definitions/typescript/register';
// Basic tokenizers only for html/css — no language service/worker, matches this project's scope
// (no rich HTML/CSS intellisense planned). JSON has no tokenizer-only module upstream, so `.json`
// files render as plain text — a deliberate scope cut, not an oversight.
import 'monaco-editor/languages/definitions/html/register';
import 'monaco-editor/languages/definitions/css/register';
import { useEffect, useRef } from 'react';
import { useFilesStore } from '../files/store';
import { syncMonacoTheme } from './monacoTheme';
import { syncMonacoCompilerOptions } from './monacoCompilerOptions';
import { useDiagnosticsStore, type DiagnosticEntry, type DiagnosticSeverity } from './diagnostics';
import styles from './MonacoEditor.module.css';

let setupDone = false;

function languageForPath(path: string): string {
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  if (ext === 'ts' || ext === 'tsx') return 'typescript';
  if (ext === 'html') return 'html';
  if (ext === 'css') return 'css';
  return 'plaintext'; // includes .json — see the import comment above
}

function severityFrom(severity: monaco.MarkerSeverity): DiagnosticSeverity {
  switch (severity) {
    case monaco.MarkerSeverity.Error:
      return 'error';
    case monaco.MarkerSeverity.Warning:
      return 'warning';
    case monaco.MarkerSeverity.Info:
      return 'info';
    default:
      return 'hint';
  }
}

export function MonacoEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelsRef = useRef(new Map<string, monaco.editor.ITextModel>());
  const order = useFilesStore((state) => state.order);
  const activePath = useFilesStore((state) => state.activePath);

  useEffect(() => {
    if (!setupDone) {
      syncMonacoTheme();
      syncMonacoCompilerOptions();
      setupDone = true;
    }
  }, []);

  // Mount once — creates the editor instance itself, with no model attached yet. The reconcile
  // effect below (which also runs on this same mount) attaches the initial model.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const editor = monaco.editor.create(container, {
      automaticLayout: true,
      fontFamily: 'var(--cp-font-mono)',
      fontSize: 13.5,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      padding: { top: 16 },
    });
    editorRef.current = editor;

    // The theme's monospace font may still be downloading when Monaco first measures character
    // widths — re-measure once it's actually available to avoid misaligned columns/cursor.
    void document.fonts.ready.then(() => monaco.editor.remeasureFonts());

    const models = modelsRef.current;
    return () => {
      editor.dispose();
      for (const model of models.values()) model.dispose();
      models.clear();
    };
  }, []);

  // Mirrors Monaco's own diagnostics (the same ones that power the red squiggles) into a plain
  // store the Problems panel can read — Monaco's marker events are global, not per-editor, so this
  // only needs to run once regardless of how many files are open.
  useEffect(() => {
    const disposable = monaco.editor.onDidChangeMarkers((uris) => {
      for (const uri of uris) {
        const markers = monaco.editor.getModelMarkers({ resource: uri });
        const entries: DiagnosticEntry[] = markers.map((marker) => ({
          path: uri.path,
          message: marker.message,
          severity: severityFrom(marker.severity),
          line: marker.startLineNumber,
          column: marker.startColumn,
        }));
        useDiagnosticsStore.getState().setForPath(uri.path, entries);
      }
    });
    return () => disposable.dispose();
  }, []);

  // Click-to-jump from the Problems panel: switch to the file, move the model + cursor there
  // synchronously (can't wait for the reconcile effect below — revealLineInCenter needs to run
  // against the *new* model, not whatever was showing before).
  useEffect(() => {
    return useDiagnosticsStore.subscribe((state) => {
      const target = state.revealTarget;
      if (!target) return;
      useFilesStore.getState().setActivePath(target.path);
      const editor = editorRef.current;
      const model = modelsRef.current.get(target.path);
      if (editor && model) {
        if (editor.getModel() !== model) editor.setModel(model);
        editor.revealLineInCenter(target.line);
        editor.setPosition({ lineNumber: target.line, column: target.column });
        editor.focus();
      }
      useDiagnosticsStore.getState().clearReveal();
    });
  }, []);

  // Reconciles the model cache against the current file set, then makes sure the active file's
  // model is the one showing. Keyed on `order` (identity changes only on create/rename/delete),
  // never on file *content* — so this doesn't run on every keystroke.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const models = modelsRef.current;
    const currentPaths = new Set(order);

    for (const [path, model] of models) {
      if (!currentPaths.has(path)) {
        model.dispose();
        models.delete(path);
        useDiagnosticsStore.getState().clearPath(path);
      }
    }

    for (const path of order) {
      if (models.has(path)) continue;
      const content = useFilesStore.getState().files[path]?.content ?? '';
      const model = monaco.editor.createModel(
        content,
        languageForPath(path),
        monaco.Uri.parse(`file://${path}`),
      );
      model.onDidChangeContent(() => {
        useFilesStore.getState().updateContent(path, model.getValue());
      });
      models.set(path, model);
    }

    const activeModel = models.get(activePath);
    if (activeModel && editor.getModel() !== activeModel) {
      editor.setModel(activeModel);
    }
  }, [order, activePath]);

  return <div ref={containerRef} className={styles.container} />;
}
