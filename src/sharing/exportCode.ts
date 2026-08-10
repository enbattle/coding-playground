import { useEditorStore } from '../editor/store';

/** Single-file only (ADR 0008) — a plain download, no zip archive needed. See ADR 0010. */
export function downloadCurrentCode(): void {
  const blob = new Blob([useEditorStore.getState().content], { type: 'text/typescript' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'index.ts';
  link.click();
  URL.revokeObjectURL(url);
}
