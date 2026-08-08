import { useEffect, useRef } from 'react';
import { buildRuntimeHarness, type HarnessInput } from './sandboxHarness';
import { isRuntimeConsoleMessage } from './runtimeMessage';
import { useExecutionStore } from './store';

/**
 * Always mounted once there's something to run — visibility (Console vs Preview tab) is a CSS
 * toggle, not a mount/unmount, so console capture keeps working regardless of which tab is active.
 *
 * `runId` bumps on every Run; changing `key` forces React to unmount the previous iframe and mount
 * a fresh one, so each run gets a clean global scope with no state leaking from the last run.
 */
export function RuntimeFrame({
  runId,
  harnessInput,
  visible,
}: {
  runId: number;
  harnessInput: HarnessInput | null;
  visible: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (harnessInput === null) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;
      if (!isRuntimeConsoleMessage(event.data)) return;
      useExecutionStore.getState().append({ level: event.data.level, text: event.data.text });
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [runId, harnessInput]);

  if (harnessInput === null) return null;

  return (
    <iframe
      key={runId}
      ref={iframeRef}
      sandbox="allow-scripts"
      srcDoc={buildRuntimeHarness(harnessInput)}
      style={{
        display: visible ? 'block' : 'none',
        width: '100%',
        height: '100%',
        border: 'none',
        background: '#fff',
      }}
      title="Execution sandbox"
    />
  );
}
