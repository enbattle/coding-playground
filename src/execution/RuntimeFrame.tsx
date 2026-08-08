import { useEffect, useRef } from 'react';
import { buildRuntimeHarness } from './sandboxHarness';
import { isRuntimeConsoleMessage } from './runtimeMessage';
import { useExecutionStore } from './store';

/**
 * Invisible — Phase 3 only captures console output. A visible Preview tab (rendering the iframe's
 * DOM instead of hiding it) lands in Phase 4.
 *
 * `runId` bumps on every Run; changing `key` forces React to unmount the previous iframe and mount
 * a fresh one, so each run gets a clean global scope with no state leaking from the last run.
 */
export function RuntimeFrame({ runId, code }: { runId: number; code: string | null }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (code === null) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;
      if (!isRuntimeConsoleMessage(event.data)) return;
      useExecutionStore.getState().append({ level: event.data.level, text: event.data.text });
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [runId, code]);

  if (code === null) return null;

  return (
    <iframe
      key={runId}
      ref={iframeRef}
      sandbox="allow-scripts"
      srcDoc={buildRuntimeHarness(code)}
      style={{ display: 'none' }}
      title="Execution sandbox"
    />
  );
}
