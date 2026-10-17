import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TranspileResponse } from './transpile.worker';

const transpileMock = vi.hoisted(() => vi.fn<() => Promise<TranspileResponse>>());
vi.mock('./transpileClient', () => ({ transpile: transpileMock }));

const { useRunnerStore } = await import('./runnerStore');
const { useExecutionStore } = await import('./store');

function deferred() {
  let resolve!: (response: TranspileResponse) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<TranspileResponse>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const ok = (code: string): TranspileResponse => ({ id: 0, code, diagnostics: [] });
const texts = () => useExecutionStore.getState().entries.map((entry) => entry.text);

describe('runnerStore', () => {
  beforeEach(() => {
    transpileMock.mockReset();
    useRunnerStore.setState({ runId: 0, code: null });
    useExecutionStore.setState({ entries: [], status: 'idle' });
  });

  it('hands compiled code to the sandbox and stays running until the sandbox reports idle', async () => {
    transpileMock.mockResolvedValue(ok('console.log(1)'));
    await useRunnerStore.getState().run();
    expect(useRunnerStore.getState().code).toBe('console.log(1)');
    expect(useExecutionStore.getState().status).toBe('running');
  });

  it('stop tears down the sandbox and says so', async () => {
    transpileMock.mockResolvedValue(ok('while (true) {}'));
    await useRunnerStore.getState().run();
    const runIdBefore = useRunnerStore.getState().runId;

    useRunnerStore.getState().stop();

    expect(useRunnerStore.getState().code).toBeNull();
    expect(useRunnerStore.getState().runId).toBeGreaterThan(runIdBefore);
    expect(useExecutionStore.getState().status).toBe('idle');
    expect(texts()).toContain('Execution stopped.');
  });

  it('stop does nothing when nothing is running', () => {
    useRunnerStore.getState().stop();
    expect(texts()).toEqual([]);
  });

  it('ignores a compile result that arrives after stop', async () => {
    const pending = deferred();
    transpileMock.mockReturnValue(pending.promise);
    const run = useRunnerStore.getState().run();
    useRunnerStore.getState().stop();
    pending.resolve(ok('console.log("stale")'));
    await run;
    expect(useRunnerStore.getState().code).toBeNull();
  });

  it('ignores an older run whose compile finishes after a newer run started', async () => {
    const first = deferred();
    const second = deferred();
    transpileMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const firstRun = useRunnerStore.getState().run();
    const secondRun = useRunnerStore.getState().run();
    second.resolve(ok('second'));
    await secondRun;
    first.resolve(ok('first'));
    await firstRun;
    expect(useRunnerStore.getState().code).toBe('second');
  });

  it('reports a compiler failure instead of hanging on "running"', async () => {
    transpileMock.mockRejectedValue(new Error('worker failed to load'));
    await useRunnerStore.getState().run();
    expect(useExecutionStore.getState().status).toBe('idle');
    expect(texts().join('\n')).toContain('worker failed to load');
  });
});
