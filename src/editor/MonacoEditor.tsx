import './monacoEnvironment';
import * as monaco from 'monaco-editor/editor/editor.api';
// Registers the 'typescript' language id + Monarch tokenizer with Monaco's basic language registry.
import 'monaco-editor/languages/definitions/typescript/register';
import { useEffect, useRef } from 'react';
import { useEditorStore } from './store';
import { syncMonacoTheme } from './monacoTheme';
import { syncMonacoCompilerOptions } from './monacoCompilerOptions';
import { syncMonacoPackageTypes } from './monacoPackageTypes';
import { registerMonacoFormattingProvider } from './monacoFormattingProvider';
import { useFormatCommandStore } from './formatCommand';
import { useDiagnosticsStore, type DiagnosticEntry, type DiagnosticSeverity } from './diagnostics';
import { useInsertRequestStore, IMPORT_SNIPPET_CURSOR_OFFSET } from '../packages/insertRequest';
import { useRunnerStore } from '../execution/runnerStore';
import { useEditorSettingsStore } from '../settings/editorSettingsStore';
import type { EditorSettingValues } from '../settings/editorSettings';
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

function toEditorOptions(
  settings: EditorSettingValues,
): monaco.editor.IStandaloneEditorConstructionOptions {
  return {
    fontSize: settings.fontSize,
    tabSize: settings.tabSize,
    wordWrap: settings.wordWrap ? 'on' : 'off',
    minimap: { enabled: settings.minimap },
    lineNumbers: settings.lineNumbers ? 'on' : 'off',
  };
}

export function MonacoEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (!setupDone) {
      syncMonacoTheme();
      syncMonacoCompilerOptions();
      syncMonacoPackageTypes();
      registerMonacoFormattingProvider();
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
      scrollBeyondLastLine: false,
      padding: { top: 16 },
      ...toEditorOptions(useEditorSettingsStore.getState()),
    });
    editorRef.current = editor;
    // Exposed only for e2e testability (see e2e/onboarding-examples.spec.ts's undo check) — this
    // isn't a new attack surface, since the same monaco-editor module instance is already
    // reachable and mutable by any script running on the page regardless. Reaching the model's
    // canUndo() directly is what let us prove pushEditOperations (in the useEditorStore.subscribe
    // effect below) preserves undo-ability, after Cmd+Z/Ctrl+Z delivered via CDP turned out to be
    // unreliable under headless automation even though the underlying undo command always worked.
    (window as unknown as { __cpEditor?: monaco.editor.IStandaloneCodeEditor }).__cpEditor = editor;

    // The theme's monospace font may still be downloading when Monaco first measures character
    // widths — re-measure once it's actually available to avoid misaligned columns/cursor.
    void document.fonts.ready.then(() => monaco.editor.remeasureFonts());

    // Monaco captures and stops propagation of Enter keydowns while it has focus (it needs Enter
    // for newlines/autocomplete acceptance), so a window-level ⌘Enter listener alone never fires
    // while the user is actively typing — confirmed by instrumenting the window listener directly:
    // the Enter keydown simply never arrives at `window` when focus is inside Monaco. Registering
    // the binding on the editor itself covers that case; CommandPalette.tsx's window-level listener
    // still covers ⌘Enter when focus is elsewhere (e.g. a popover button).
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      void useRunnerStore.getState().run();
    });

    const subscription = editor.onDidChangeModelContent(() => {
      useEditorStore.getState().setContent(model.getValue());
    });

    return () => {
      subscription.dispose();
      editor.dispose();
      model.dispose();
    };
  }, []);

  // Applies editor settings (Settings modal) live, without needing a remount.
  useEffect(() => {
    return useEditorSettingsStore.subscribe((settings) => {
      editorRef.current?.updateOptions(toEditorOptions(settings));
    });
  }, []);

  // Pushes external content changes (loading a saved playground, importing a share link while
  // already mounted) into the live model. The equality check is what keeps this from looping back
  // on the editor's *own* edits: onDidChangeModelContent above already wrote the new text into
  // both the model and the store by the time this fires, so model.getValue() === state.content and
  // this is a no-op for ordinary typing — it only does work when the store changed out from under
  // the model some other way.
  useEffect(() => {
    return useEditorStore.subscribe((state) => {
      const editor = editorRef.current;
      const model = editor?.getModel();
      if (!editor || !model) return;
      if (model.getValue() === state.content) return;
      const position = editor.getPosition();
      model.pushEditOperations(
        [],
        [{ range: model.getFullModelRange(), text: state.content }],
        () => null,
      );
      if (position) editor.setPosition(position);
    });
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

  // "Insert import" from the Packages panel — inserts at the cursor and leaves it positioned
  // between the snippet's braces, ready to type a named import.
  useEffect(() => {
    return useInsertRequestStore.subscribe((state) => {
      const snippet = state.pendingSnippet;
      if (!snippet) return;
      const editor = editorRef.current;
      if (editor) {
        const position = editor.getPosition() ?? { lineNumber: 1, column: 1 };
        editor.executeEdits('insert-import', [
          {
            range: new monaco.Range(
              position.lineNumber,
              position.column,
              position.lineNumber,
              position.column,
            ),
            text: snippet,
          },
        ]);
        editor.setPosition({
          lineNumber: position.lineNumber,
          column: position.column + IMPORT_SNIPPET_CURSOR_OFFSET,
        });
        editor.focus();
      }
      useInsertRequestStore.getState().clear();
    });
  }, []);

  // "Format Document" from the command palette — runs Monaco's own native format action (the same
  // one Shift+Alt+F triggers) rather than reimplementing edit application.
  useEffect(() => {
    return useFormatCommandStore.subscribe(() => {
      // `editor.getAction(id)` relies on the editor-action contribution registry, which our
      // minimal modular Monaco imports don't wire up (confirmed: getSupportedActions() returns
      // an empty list on this editor instance, even though the same command works via its
      // keybinding). `editor.trigger` invokes the command directly through Monaco's command
      // service instead — the same path a keybinding resolves to — and works regardless, focus
      // or no focus. See AGENTS.md's Monaco integration notes.
      editorRef.current?.trigger('command-palette', 'editor.action.formatDocument', null);
    });
  }, []);

  return <div ref={containerRef} className={styles.container} />;
}
