import './monacoEnvironment';
import * as monaco from 'monaco-editor/editor/editor.api';
// Registers the 'typescript' language id + Monarch tokenizer with Monaco's basic language registry.
import 'monaco-editor/languages/definitions/typescript/register';
import { useEffect, useRef } from 'react';
import { useEditorStore } from './store';
import { syncMonacoTheme } from './monacoTheme';
import { syncMonacoCompilerOptions } from './monacoCompilerOptions';
import { useDiagnosticsStore, type DiagnosticEntry, type DiagnosticSeverity } from './diagnostics';
import styles from './MonacoEditor.module.css';

const ENTRY_URI = 'file:///index.ts';

let setupDone = false;

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

  useEffect(() => {
    if (!setupDone) {
      syncMonacoTheme();
      syncMonacoCompilerOptions();
      setupDone = true;
    }
  }, []);

  // Single fixed file for now (see ADR 0008) — one model, created once, never swapped.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const model = monaco.editor.createModel(
      useEditorStore.getState().content,
      'typescript',
      monaco.Uri.parse(ENTRY_URI),
    );

    const editor = monaco.editor.create(container, {
      model,
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

    const subscription = editor.onDidChangeModelContent(() => {
      useEditorStore.getState().setContent(model.getValue());
    });

    return () => {
      subscription.dispose();
      editor.dispose();
      model.dispose();
    };
  }, []);

  // Mirrors Monaco's own diagnostics (the same ones that power the red squiggles) into a plain
  // store the Problems panel can read.
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

  // Click-to-jump from the Problems panel.
  useEffect(() => {
    return useDiagnosticsStore.subscribe((state) => {
      const target = state.revealTarget;
      if (!target) return;
      const editor = editorRef.current;
      if (editor) {
        editor.revealLineInCenter(target.line);
        editor.setPosition({ lineNumber: target.line, column: target.column });
        editor.focus();
      }
      useDiagnosticsStore.getState().clearReveal();
    });
  }, []);

  return <div ref={containerRef} className={styles.container} />;
}
