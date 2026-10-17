import { create } from 'zustand';
import { useEditorStore } from '../editor/store';
import { getCompilerOptionValues } from '../settings/compilerOptionsStore';
import { transpile } from './transpileClient';
import { useExecutionStore } from './store';

interface RunnerState {
  /** Bumped on every Run and Stop — RuntimeFrame keys the sandbox iframe on it, and a compile
   * result whose run id is no longer current is stale and gets dropped. */
  runId: number;
  /** Compiled code for the live sandbox, or null when there's no sandbox (never run, or stopped). */
  code: string | null;
  run: () => Promise<void>;
  stop: () => void;
}

/**
 * A store rather than a hook (this replaces the earlier component-local `useRunner`) — Run needs
 * to be triggered from more than one place now: the header's Run button, the command palette, and
 * the global ⌘Enter shortcut. All three call `useRunnerStore.getState().run()` directly; only
 * `RuntimeFrame` needs the reactive `runId`/`code` subscription.
 *
 * `status` stays 'running' after the code is handed over: the sandbox reports 'idle' itself once
 * the program's top level has finished and no timers are pending (see sandboxHarness.ts), which is
 * what keeps Stop available for as long as there's anything left to stop.
 */
export const useRunnerStore = create<RunnerState>()((set, get) => ({
  runId: 0,
  code: null,
  run: async () => {
    // Claim this run's id and tear down any previous sandbox before the (async) compile, so a
    // slower, older compile can never overwrite a newer one's result.
    const runId = get().runId + 1;
    set({ runId, code: null });
    const source = useEditorStore.getState().content;
    const executionStore = useExecutionStore.getState();
    executionStore.clear();
    executionStore.setStatus('running');

    let result;
    try {
      result = await transpile(source, getCompilerOptionValues());
    } catch (error) {
      if (get().runId !== runId) return;
      executionStore.append({
        level: 'error',
        text: `Couldn't compile: ${error instanceof Error ? error.message : String(error)}`,
      });
      executionStore.setStatus('idle');
      return;
    }
    if (get().runId !== runId) return;

    for (const diagnostic of result.diagnostics) {
      executionStore.append({ level: 'error', text: `Compile error: ${diagnostic}` });
    }
    set({ code: result.code });
  },
  stop: () => {
    const executionStore = useExecutionStore.getState();
    if (executionStore.status !== 'running') return;
    // Unmounting the sandbox iframe destroys the worker inside it — immediate, even mid-loop.
    set({ runId: get().runId + 1, code: null });
    executionStore.append({ level: 'info', text: 'Execution stopped.' });
    executionStore.setStatus('idle');
  },
}));
