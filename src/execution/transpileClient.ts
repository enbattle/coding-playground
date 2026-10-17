import TranspileWorker from './transpile.worker?worker';
import type { TranspileRequest, TranspileResponse } from './transpile.worker';
import type { CompilerOptionValues } from '../settings/compilerOptions';

interface PendingRequest {
  resolve: (response: TranspileResponse) => void;
  reject: (error: Error) => void;
}

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, PendingRequest>();

function getWorker(): Worker {
  if (worker) return worker;
  const created = new TranspileWorker();
  created.onmessage = (event: MessageEvent<TranspileResponse>) => {
    const request = pending.get(event.data.id);
    if (!request) return;
    pending.delete(event.data.id);
    request.resolve(event.data);
  };
  // Without this, a worker that fails to load (e.g. its chunk 404s in a tab left open across a
  // redeploy) or throws mid-compile leaves every pending promise unsettled — Run sat on "Running"
  // forever. Fail everything in flight and drop the worker so the next Run starts a fresh one.
  created.onerror = (event: ErrorEvent) => {
    event.preventDefault();
    const error = new Error(event.message || 'The TypeScript compiler worker failed to load.');
    for (const request of pending.values()) request.reject(error);
    pending.clear();
    created.terminate();
    if (worker === created) worker = null;
  };
  worker = created;
  return created;
}

export function transpile(
  source: string,
  options: CompilerOptionValues,
): Promise<TranspileResponse> {
  const id = nextId++;
  const request: TranspileRequest = { id, source, options };
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage(request);
  });
}
