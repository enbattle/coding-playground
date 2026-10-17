import { useEffect, useRef } from 'react';
import { buildRuntimeHarness } from './sandboxHarness';
import { isRuntimeMessage, type RuntimeConsoleMessage } from './runtimeMessage';
import { MAX_CONSOLE_ENTRIES, useExecutionStore } from './store';

/**
 * Invisible — only powers console capture (ADR 0008 dropped the Preview tab along with multi-file
 * support). `runId` bumps on every Run; changing `key` forces React to unmount the previous iframe
 * and mount a fresh one, so each run gets a clean global scope with no state leaking from the last.
 */
export function RuntimeFrame({ runId, code }: { runId: number; code: string | null }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (code === null) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Console lines are queued and handed to the store at most once per frame. A logging loop
    // sends lines faster than the console can re-render, and one store update (and render) per
    // message is what buried the page before. The queue is trimmed the same way the store is.
    let queue: RuntimeConsoleMessage['entries'] = [];
    let queuedDropped = 0;
    let frame: number | null = null;
    const flush = () => {
      frame = null;
      useExecutionStore.getState().appendMany(queue, queuedDropped);
      queue = [];
      queuedDropped = 0;
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;
      const message: unknown = event.data;
      if (!isRuntimeMessage(message)) return;
      if (message.type === 'status') {
        useExecutionStore.getState().setStatus(message.status);
        return;
      }
      queue.push(...message.entries);
      queuedDropped += message.dropped;
      if (queue.length >= 2 * MAX_CONSOLE_ENTRIES) {
        queuedDropped += queue.length - MAX_CONSOLE_ENTRIES;
        queue = queue.slice(-MAX_CONSOLE_ENTRIES);
      }
      frame ??= requestAnimationFrame(flush);
    };

    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      // Lines still queued belong to a run that's being replaced or stopped — drop them rather
      // than let them land after the next run's cleared console or after "Execution stopped."
      if (frame !== null) cancelAnimationFrame(frame);
    };
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
