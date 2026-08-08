export type ConsoleLevel = 'log' | 'warn' | 'error' | 'info' | 'debug'

export interface RuntimeConsoleMessage {
  source: 'coding-playground-runtime'
  type: 'console'
  level: ConsoleLevel
  text: string
}

export function isRuntimeConsoleMessage(data: unknown): data is RuntimeConsoleMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { source?: unknown }).source === 'coding-playground-runtime' &&
    (data as { type?: unknown }).type === 'console'
  )
}
