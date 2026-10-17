import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { SAMPLE_SOURCE, useEditorStore } from '../editor/store';
import { useWelcomeModalStore } from '../onboarding/welcomeModalStore';
import {
  DEFAULT_COMPILER_OPTIONS,
  pickCompilerOptions,
  type CompilerOptionValues,
} from '../settings/compilerOptions';
import { getCompilerOptionValues, useCompilerOptionsStore } from '../settings/compilerOptionsStore';
import { SETTINGS_SCHEMA_VERSION } from '../settings/schemaVersion';
import { useShareLinkPromptStore } from './shareLinkPromptStore';

interface SharePayload {
  v: number;
  code: string;
  compilerOptions: CompilerOptionValues;
}

/** What a share link carries, once parsed and validated. */
export interface SharedPlayground {
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
 * Decodes a share hash. Best-effort like `importSettingsFromText`: anything malformed, or without
 * code, is null — never thrown. Compiler options go through the same validation as every other
 * outside source, merged onto defaults so the link reproduces the sender's options exactly.
 */
export function parseSharePayload(hash: string): SharedPlayground | null {
  if (!hash) return null;
  let payload: unknown;
  try {
    const decompressed = decompressFromEncodedURIComponent(hash);
    if (!decompressed) return null;
    payload = JSON.parse(decompressed);
  } catch {
    return null;
  }
  if (typeof payload !== 'object' || payload === null) return null;
  const { code, compilerOptions } = payload as Partial<Record<keyof SharePayload, unknown>>;
  if (typeof code !== 'string') return null;
  return {
    code,
    compilerOptions: { ...DEFAULT_COMPILER_OPTIONS, ...pickCompilerOptions(compilerOptions) },
  };
}

/** Only ask before replacing code that's actually someone's work: not the untouched sample, not
 * an empty editor, and not code identical to what the link carries. */
export function needsConfirmation(currentCode: string, sharedCode: string): boolean {
  return currentCode !== sharedCode && currentCode !== SAMPLE_SOURCE && currentCode.trim() !== '';
}

export function applySharedPlayground(shared: SharedPlayground): void {
  useEditorStore.getState().setContent(shared.code);
  useCompilerOptionsStore.setState(shared.compilerOptions);
}

/**
 * Reads a share link out of `location.hash` (if present), then strips the hash. Stripping
 * matters: without it, a later reload would keep re-applying the same (increasingly stale)
 * snapshot over whatever the user typed since opening the link, silently discarding their edits.
 *
 * A link used to replace the editor's autosaved content outright, with no undo (the editor is
 * seeded from the already-replaced store). Now, if the editor holds real work, the link is held
 * for ShareLinkPrompt to confirm, and the Welcome modal is skipped: a visitor with work in
 * progress isn't new here. Called synchronously from main.tsx, before the first render, so a link
 * that applies immediately is already in the stores when the editor mounts.
 */
export function openShareLinkFromHash(): void {
  const hash = window.location.hash.slice(1);
  if (!hash) return;
  history.replaceState(null, '', window.location.pathname + window.location.search);

  const shared = parseSharePayload(hash);
  if (!shared) return;
  if (needsConfirmation(useEditorStore.getState().content, shared.code)) {
    useShareLinkPromptStore.getState().setPending(shared);
    useWelcomeModalStore.getState().setOpen(false);
  } else {
    applySharedPlayground(shared);
  }
}
