import type { CompilerOptionValues } from '../settings/compilerOptions';
import { PACKAGE_IMPORT_MAP } from '../packages/registry';
import { transpileSource } from './transpile';

/**
 * Runs entirely off the main thread. Unrelated to Monaco's own TS language-service worker
 * (src/editor/monacoEnvironment.ts) — this one only transpiles for execution (ADR 0002), it does
 * no type-checking of its own. The logic itself lives in ./transpile.ts so it can be unit-tested
 * without a worker; this file is only the message plumbing.
 */

export interface TranspileRequest {
  id: number;
  source: string;
  options: CompilerOptionValues;
}

export interface TranspileResponse {
  id: number;
  code: string;
  diagnostics: string[];
}

self.onmessage = (event: MessageEvent<TranspileRequest>) => {
  const { id, source, options } = event.data;
  const response: TranspileResponse = {
    id,
    ...transpileSource(source, options, PACKAGE_IMPORT_MAP),
  };
  self.postMessage(response);
};
