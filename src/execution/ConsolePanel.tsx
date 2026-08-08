import { useExecutionStore } from './store'
import styles from './ConsolePanel.module.css'

const LEVEL_MARKER: Record<string, string> = {
  log: '▸',
  info: 'ℹ',
  warn: '⚠',
  error: '✕',
  debug: '▸',
}

export function ConsolePanel() {
  const entries = useExecutionStore((state) => state.entries)
  const status = useExecutionStore((state) => state.status)

  return (
    <div className={styles.pane}>
      <div className={styles.head}>
        <span className={status === 'running' ? `${styles.dot} ${styles.running}` : styles.dot} />
        Console · {status === 'running' ? 'running' : 'ready'}
      </div>
      <div className={styles.body}>
        {entries.length === 0 && (
          <div className={styles.empty}>Run your code to see output here.</div>
        )}
        {entries.map((entry) => (
          <div key={entry.id} className={`${styles.entry} ${styles[entry.level] ?? ''}`}>
            <span className={styles.marker}>{LEVEL_MARKER[entry.level] ?? '▸'}</span>
            <span>{entry.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
