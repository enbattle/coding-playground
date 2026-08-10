import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { useEditorStore } from '../editor/store';
import { DEFAULT_COMPILER_OPTIONS, type CompilerOptionValues } from '../settings/compilerOptions';
import { getCompilerOptionValues, useCompilerOptionsStore } from '../settings/compilerOptionsStore';
import { SETTINGS_SCHEMA_VERSION } from '../settings/schemaVersion';

interface SharePayload {
  v: number;
  code: string;
  compilerOptions: CompilerOptionValues;
}

/** Builds a full URL whose hash fragment carries the current code + compiler options, compressed.
 * The hash never reaches a server (it's stripped before any request is made), so this needs no
 * backend — see the "shareable link without a backend" discussion this phase started from. */
export function buildShareUrl(): string {
  const payload: SharePayload = {
    v: SETTINGS_SCHEMA_VERSION,
    code: useEditorStore.getState().content,
    compilerOptions: getCompilerOptionValues(),
  };
  const url = new URL(window.location.href);
  url.hash = compressToEncodedURIComponent(JSON.stringify(payload));
  return url.toString();
}

/**
 * Reads a share payload out of `location.hash` (if present), applies it to the editor/compiler
 * stores, then strips the hash. Stripping matters: without it, a later reload would keep
 * re-applying the same (increasingly stale) snapshot over whatever the user typed since opening
 * the link, silently discarding their edits. Best-effort like `importSettingsFromText` — malformed
 * or unrecognized payloads are ignored, never thrown. Must run before the editor first renders, so
 * it's called synchronously from main.tsx, not from a component effect.
 */
export function applyShareLinkFromHash(): void {
  const hash = window.location.hash.slice(1);
  if (!hash) return;

  history.replaceState(null, '', window.location.pathname + window.location.search);

  let payload: Partial<SharePayload> | null;
  try {
    const decompressed = decompressFromEncodedURIComponent(hash);
    if (!decompressed) return;
    payload = JSON.parse(decompressed) as Partial<SharePayload>;
  } catch {
    return;
  }
  if (typeof payload !== 'object' || payload === null) return;

  if (typeof payload.code === 'string') {
    useEditorStore.getState().setContent(payload.code);
  }
  if (typeof payload.compilerOptions === 'object' && payload.compilerOptions !== null) {
    for (const key of Object.keys(DEFAULT_COMPILER_OPTIONS) as (keyof CompilerOptionValues)[]) {
      if (key in payload.compilerOptions) {
        useCompilerOptionsStore.getState().setOption(key, payload.compilerOptions[key] as never);
      }
    }
  }
}
