import { useState, type ReactNode } from 'react';
import { MonacoEditor } from '../editor/MonacoEditor';
import { ProblemsPanel } from '../editor/ProblemsPanel';
import { useProblemsCount } from '../editor/diagnostics';
import { FileTabs } from '../files/FileTabs';
import { useFilesStore } from '../files/store';
import { ConsolePanel } from '../execution/ConsolePanel';
import { RuntimeFrame } from '../execution/RuntimeFrame';
import { useRunner } from '../execution/useRunner';
import { CompilerOptionsPanel } from '../settings/CompilerOptionsPanel';
import { ThemeMotif } from '../theme/motifs';
import { useThemeStore, resolveActiveTokens } from '../theme/store';
import { ThemeSwitcher } from '../theme/ThemeSwitcher';
import { SplitPane } from './SplitPane';
import styles from './AppShell.module.css';

type RightTab = 'console' | 'preview' | 'problems';

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={active ? `${styles.rightTab} ${styles.active}` : styles.rightTab}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function AppShell() {
  const tokens = useThemeStore(resolveActiveTokens);
  const { runId, harnessInput, run } = useRunner();
  const [rightTab, setRightTab] = useState<RightTab>('console');
  const activePath = useFilesStore((state) => state.activePath);
  const problemsCount = useProblemsCount();

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
          <CompilerOptionsPanel />
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
                <TabButton active={rightTab === 'console'} onClick={() => setRightTab('console')}>
                  Console
                </TabButton>
                <TabButton active={rightTab === 'preview'} onClick={() => setRightTab('preview')}>
                  Preview
                </TabButton>
                <TabButton active={rightTab === 'problems'} onClick={() => setRightTab('problems')}>
                  Problems{problemsCount > 0 ? ` (${problemsCount})` : ''}
                </TabButton>
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
                <div
                  style={{ display: rightTab === 'problems' ? 'block' : 'none', height: '100%' }}
                >
                  <ProblemsPanel />
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
