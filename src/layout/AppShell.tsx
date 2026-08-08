import { MonacoEditor } from '../editor/MonacoEditor'
import { ConsolePanel } from '../execution/ConsolePanel'
import { RuntimeFrame } from '../execution/RuntimeFrame'
import { useRunner } from '../execution/useRunner'
import { ThemeMotif } from '../theme/motifs'
import { useThemeStore, resolveActiveTokens } from '../theme/store'
import { ThemeSwitcher } from '../theme/ThemeSwitcher'
import { SplitPane } from './SplitPane'
import styles from './AppShell.module.css'

export function AppShell() {
  const tokens = useThemeStore(resolveActiveTokens)
  const { runId, code, run } = useRunner()

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
          <button type="button" className={styles.run} onClick={() => void run()}>
            ▸ Run
          </button>
        </header>
        <SplitPane
          left={
            <div className={styles.editorHost}>
              <MonacoEditor />
            </div>
          }
          right={<ConsolePanel />}
        />
        <RuntimeFrame runId={runId} code={code} />
        <footer className={styles.footer}>
          <span>index.ts</span>
          <span>{tokens.name}</span>
        </footer>
      </div>
    </>
  )
}
