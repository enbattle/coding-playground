import { useDiagnosticsStore, type DiagnosticEntry, type DiagnosticSeverity } from './diagnostics';
import styles from './ProblemsPanel.module.css';

const SEVERITY_ORDER: Record<DiagnosticSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
  hint: 3,
};

const SEVERITY_MARKER: Record<DiagnosticSeverity, string> = {
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
  hint: '·',
};

function sortEntries(byPath: Record<string, DiagnosticEntry[]>): DiagnosticEntry[] {
  return Object.values(byPath)
    .flat()
    .sort((a, b) => {
      if (a.severity !== b.severity) return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      if (a.path !== b.path) return a.path.localeCompare(b.path);
      return a.line - b.line;
    });
}

export function ProblemsPanel() {
  const byPath = useDiagnosticsStore((state) => state.byPath);
  const requestReveal = useDiagnosticsStore((state) => state.requestReveal);
  const entries = sortEntries(byPath);

  return (
    <div className={styles.pane}>
      <div className={styles.body}>
        {entries.length === 0 && <div className={styles.empty}>No problems.</div>}
        {entries.map((entry, index) => (
          <button
            key={`${entry.path}:${entry.line}:${entry.column}:${index}`}
            type="button"
            className={styles.entry}
            onClick={() =>
              requestReveal({ path: entry.path, line: entry.line, column: entry.column })
            }
          >
            <span className={`${styles.marker} ${styles[entry.severity]}`}>
              {SEVERITY_MARKER[entry.severity]}
            </span>
            <span className={styles.location}>
              {entry.path.slice(1)}:{entry.line}:{entry.column}
            </span>
            <span className={styles.message}>{entry.message}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
