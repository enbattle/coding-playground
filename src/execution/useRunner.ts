import { useCallback, useState } from 'react';
import { useEditorStore } from '../editor/store';
import { transpile } from './transpileClient';
import { useExecutionStore } from './store';

export function useRunner() {
  const [runId, setRunId] = useState(0);
  const [code, setCode] = useState<string | null>(null);

  const run = useCallback(async () => {
    const source = useEditorStore.getState().content;
    const store = useExecutionStore.getState();
    store.clear();
    store.setStatus('running');

    const result = await transpile(source);
    for (const diagnostic of result.diagnostics) {
      store.append({ level: 'error', text: `Compile error: ${diagnostic}` });
    }

    setCode(result.code);
    setRunId((id) => id + 1);
    store.setStatus('idle');
  }, []);

  return { runId, code, run };
}
