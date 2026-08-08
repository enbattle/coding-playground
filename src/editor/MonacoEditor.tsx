import './monacoEnvironment';
import * as monaco from 'monaco-editor/editor/editor.api';
// Registers the 'typescript' language id + Monarch tokenizer with Monaco's basic language registry.
import 'monaco-editor/languages/definitions/typescript/register';
// The language service itself (diagnostics, completions) — monaco-editor 0.56 moved this out from
// under `monaco.languages.typescript` (now a deprecated stub) to direct named exports.
import {
  typescriptDefaults,
  ScriptTarget,
  ModuleKind,
  ModuleResolutionKind,
} from 'monaco-editor/languages/features/typescript/register';
import { useEffect, useRef } from 'react';
import { syncMonacoTheme } from './monacoTheme';
import { useEditorStore } from './store';
import styles from './MonacoEditor.module.css';

typescriptDefaults.setCompilerOptions({
  // This trimmed-down ScriptTarget enum tops out at ESNext (no discrete ES2022/ES2023 members).
  target: ScriptTarget.ESNext,
  module: ModuleKind.ESNext,
  // This API predates TS's 'bundler' resolution mode — 'NodeJs' is the closest available option.
  // Revisit once Phase 6 (packages) needs resolution to actually match the esm.sh import map.
  moduleResolution: ModuleResolutionKind.NodeJs,
  strict: true,
  esModuleInterop: true,
  skipLibCheck: true,
});

let themeSynced = false;

export function MonacoEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (!themeSynced) {
      syncMonacoTheme();
      themeSynced = true;
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const model = monaco.editor.createModel(
      useEditorStore.getState().content,
      'typescript',
      monaco.Uri.parse('file:///index.ts'),
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

  return <div ref={containerRef} className={styles.container} />;
}
