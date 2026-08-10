import * as monaco from 'monaco-editor/editor/editor.api';
import { formatTypeScript } from './prettierFormat';

let registered = false;

/**
 * Registers Prettier as Monaco's formatting provider for TypeScript — once this runs, Monaco's
 * *native* Format Document command (Shift+Alt+F, right-click menu) just works with no further
 * wiring. The command palette's "Format Document" entry (src/commandPalette/commands.ts) invokes
 * that same native action rather than calling `formatTypeScript` directly, so there's exactly one
 * code path that applies formatting edits to the editor (Monaco's own, which preserves undo
 * history and cursor position correctly) instead of two.
 */
export function registerMonacoFormattingProvider(): void {
  if (registered) return;
  registered = true;

  monaco.languages.registerDocumentFormattingEditProvider('typescript', {
    async provideDocumentFormattingEdits(model) {
      const formatted = await formatTypeScript(model.getValue());
      return [{ range: model.getFullModelRange(), text: formatted }];
    },
  });
}
