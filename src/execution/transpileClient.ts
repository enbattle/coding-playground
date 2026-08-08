import TranspileWorker from './transpile.worker?worker';
import type { TranspileRequest, TranspileResponse } from './transpile.worker';
import type { CompilerOptionValues } from '../settings/compilerOptions';

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, (response: TranspileResponse) => void>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new TranspileWorker();
  worker.onmessage = (event: MessageEvent<TranspileResponse>) => {
    const resolve = pending.get(event.data.id);
    if (!resolve) return;
    pending.delete(event.data.id);
    resolve(event.data);
  };
  return worker;
}

export function transpile(
  source: string,
  options: CompilerOptionValues,
): Promise<TranspileResponse> {
  const id = nextId++;
  const request: TranspileRequest = { id, source, options };
  return new Promise((resolve) => {
    pending.set(id, resolve);
    getWorker().postMessage(request);
  });
}
