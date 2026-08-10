import { create } from 'zustand';
import { useEditorStore } from '../editor/store';
import { getCompilerOptionValues } from '../settings/compilerOptionsStore';
import { transpile } from './transpileClient';
import { useExecutionStore } from './store';

interface RunnerState {
  runId: number;
  code: string | null;
  run: () => Promise<void>;
}

/**
 * A store rather than a hook (this replaces the earlier component-local `useRunner`) — Run needs
 * to be triggered from more than one place now: the header's Run button, the command palette, and
 * the global ⌘Enter shortcut. All three call `useRunnerStore.getState().run()` directly; only
 * `RuntimeFrame` needs the reactive `runId`/`code` subscription.
 */
export const useRunnerStore = create<RunnerState>()((set, get) => ({
  runId: 0,
  code: null,
  run: async () => {
    const source = useEditorStore.getState().content;
    const executionStore = useExecutionStore.getState();
    executionStore.clear();
    executionStore.setStatus('running');

    const result = await transpile(source, getCompilerOptionValues());
    for (const diagnostic of result.diagnostics) {
      executionStore.append({ level: 'error', text: `Compile error: ${diagnostic}` });
    }

    set({ code: result.code, runId: get().runId + 1 });
    executionStore.setStatus('idle');
  },
}));
