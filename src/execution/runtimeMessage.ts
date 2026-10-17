export type ConsoleLevel = 'log' | 'warn' | 'error' | 'info' | 'debug';

interface RuntimeMessageBase {
  source: 'coding-playground-runtime';
}

export interface RuntimeConsoleMessage extends RuntimeMessageBase {
  type: 'console';
  level: ConsoleLevel;
  text: string;
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
