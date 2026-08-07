import { ThemeMotif } from '../theme/motifs'
import { useThemeStore, resolveActiveTokens } from '../theme/store'
import { ThemeSwitcher } from '../theme/ThemeSwitcher'
import { SplitPane } from './SplitPane'
import styles from './AppShell.module.css'

// Placeholder content only — the real editor (Phase 3: Monaco + Web Worker transpile) and real
// console (captured from the sandboxed iframe) replace these panes without changing this shell.
function EditorPlaceholder() {
  return (
    <div className={styles.editorPane}>
      <div className={styles.line}>
        <span className={styles.ln}>1</span>
        <span className={styles.kw}>function</span> <span className={styles.fn}>greet</span>
        <span className={styles.punct}>(</span>
        <span className={styles.var}>name</span>
        <span className={styles.punct}>: string):</span> string{' '}
        <span className={styles.punct}>{'{'}</span>
      </div>
      <div className={styles.line}>
        <span className={styles.ln}>2</span>
        &nbsp;&nbsp;<span className={styles.kw}>return</span>{' '}
        <span className={styles.str}>
          `Hello, ${'{'}name{'}'}!`
        </span>
        <span className={styles.punct}>;</span>
      </div>
      <div className={styles.line}>
        <span className={styles.ln}>3</span>
        <span className={styles.punct}>{'}'}</span>
      </div>
      <div className={styles.line}>
        <span className={styles.ln}>4</span>
      </div>
      <div className={styles.line}>
        <span className={styles.ln}>5</span>
        <span className={styles.var}>console</span>
        <span className={styles.punct}>.</span>
        <span className={styles.fn}>log</span>
        <span className={styles.punct}>(</span>
        <span className={styles.fn}>greet</span>
        <span className={styles.punct}>(</span>
        <span className={styles.str}>"world"</span>
        <span className={styles.punct}>));</span>
      </div>
    </div>
  )
}

function ConsolePlaceholder() {
  return (
    <div className={styles.consolePane}>
      <div className={styles.consoleHead}>
        <span className={styles.dot} /> Console · ready
      </div>
      <div className={styles.consoleBody}>&quot;Hello, world!&quot;</div>
    </div>
  )
}

export function AppShell() {
  const tokens = useThemeStore(resolveActiveTokens)

  return (
    <>
      <ThemeMotif motif={tokens.motif} />
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.logo}>
            coding<b>▪</b>playground
          </div>
          <div className={styles.tabs}>
            <div className={`${styles.tab} ${styles.active}`}>index.ts</div>
            <div className={styles.tab}>+</div>
          </div>
          <div className={styles.spacer} />
          <ThemeSwitcher />
          <div className={styles.kbd}>⌘K</div>
          <button type="button" className={styles.run}>
            ▸ Run
          </button>
        </header>
        <SplitPane left={<EditorPlaceholder />} right={<ConsolePlaceholder />} />
        <footer className={styles.footer}>
          <span>Ln 5, Col 34</span>
          <span>{tokens.name}</span>
        </footer>
      </div>
    </>
  )
}
