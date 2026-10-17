import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_COMPILER_OPTIONS } from '../settings/compilerOptions';

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  posted: unknown[] = [];
  terminated = false;
  constructor() {
    FakeWorker.instances.push(this);
  }
  postMessage(message: unknown) {
    this.posted.push(message);
  }
  terminate() {
    this.terminated = true;
  }
}

vi.mock('./transpile.worker?worker', () => ({ default: FakeWorker }));

const { transpile } = await import('./transpileClient');

describe('transpileClient', () => {
  it('rejects pending requests when the worker fails, and starts a fresh worker next time', async () => {
    const pending = transpile('x', DEFAULT_COMPILER_OPTIONS);
    const broken = FakeWorker.instances.at(-1)!;
    broken.onerror?.(new ErrorEvent('error', { message: 'failed to fetch worker script' }));

    await expect(pending).rejects.toThrow('failed to fetch worker script');
    expect(broken.terminated).toBe(true);

    void transpile('y', DEFAULT_COMPILER_OPTIONS);
    expect(FakeWorker.instances.at(-1)).not.toBe(broken);
  });
});
