import { useState } from 'react';
import { MonacoEditor } from '../editor/MonacoEditor';
import { FileTabs } from '../files/FileTabs';
import { useFilesStore } from '../files/store';
import { ConsolePanel } from '../execution/ConsolePanel';
import { RuntimeFrame } from '../execution/RuntimeFrame';
import { useRunner } from '../execution/useRunner';
import { ThemeMotif } from '../theme/motifs';
import { useThemeStore, resolveActiveTokens } from '../theme/store';
import { ThemeSwitcher } from '../theme/ThemeSwitcher';
import { SplitPane } from './SplitPane';
import styles from './AppShell.module.css';

type RightTab = 'console' | 'preview';

export function AppShell() {
  const tokens = useThemeStore(resolveActiveTokens);
  const { runId, harnessInput, run } = useRunner();
  const [rightTab, setRightTab] = useState<RightTab>('console');
  const activePath = useFilesStore((state) => state.activePath);

  return (
    <>
      <ThemeMotif motif={tokens.motif} />
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.logo}>
            coding<b>▪</b>playground
          </div>
          <FileTabs />
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
          right={
            <div className={styles.rightPane}>
              <div className={styles.rightTabs}>
                <button
                  type="button"
                  className={
                    rightTab === 'console' ? `${styles.rightTab} ${styles.active}` : styles.rightTab
                  }
                  onClick={() => setRightTab('console')}
                >
                  Console
                </button>
                <button
                  type="button"
                  className={
                    rightTab === 'preview' ? `${styles.rightTab} ${styles.active}` : styles.rightTab
                  }
                  onClick={() => setRightTab('preview')}
                >
                  Preview
                </button>
              </div>
              <div className={styles.rightBody}>
                <div style={{ display: rightTab === 'console' ? 'block' : 'none', height: '100%' }}>
                  <ConsolePanel />
                </div>
                <div style={{ display: rightTab === 'preview' ? 'block' : 'none', height: '100%' }}>
                  {harnessInput === null && (
                    <div className={styles.previewEmpty}>Run your code to see a preview here.</div>
                  )}
                  <RuntimeFrame
                    runId={runId}
                    harnessInput={harnessInput}
                    visible={rightTab === 'preview'}
                  />
                </div>
              </div>
            </div>
          }
        />
        <footer className={styles.footer}>
          <span>{activePath.slice(1)}</span>
          <span>{tokens.name}</span>
        </footer>
      </div>
    </>
  );
}
