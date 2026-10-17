export type ConsoleLevel = 'log' | 'warn' | 'error' | 'info' | 'debug';

interface RuntimeMessageBase {
  source: 'coding-playground-runtime';
}

/** A batch of console lines; `dropped` counts earlier lines the sandbox trimmed from this batch. */
export interface RuntimeConsoleMessage extends RuntimeMessageBase {
  type: 'console';
  entries: { level: ConsoleLevel; text: string }[];
  dropped: number;
}

/** Sent by the sandbox on each idle↔running transition — see sandboxHarness.ts. */
export interface RuntimeStatusMessage extends RuntimeMessageBase {
  type: 'status';
  status: 'idle' | 'running';
}

export type RuntimeMessage = RuntimeConsoleMessage | RuntimeStatusMessage;

export function isRuntimeMessage(data: unknown): data is RuntimeMessage {
  if (typeof data !== 'object' || data === null) return false;
  const { source, type } = data as { source?: unknown; type?: unknown };
  return source === 'coding-playground-runtime' && (type === 'console' || type === 'status');
}
