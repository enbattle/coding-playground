import { useState, type ReactNode } from 'react';
import { CommandPalette } from '../commandPalette/CommandPalette';
import { useCommandPaletteStore } from '../commandPalette/store';
import { MonacoEditor } from '../editor/MonacoEditor';
import { ProblemsPanel } from '../editor/ProblemsPanel';
import { useProblemsCount } from '../editor/diagnostics';
import { ConsolePanel } from '../execution/ConsolePanel';
import { RuntimeFrame } from '../execution/RuntimeFrame';
import { useRunnerStore } from '../execution/runnerStore';
import { PackagesPanel } from '../packages/PackagesPanel';
import { CompilerOptionsPanel } from '../settings/CompilerOptionsPanel';
import { SettingsModal } from '../settings/SettingsModal';
import { SharingPanel } from '../sharing/SharingPanel';
import { ThemeMotif } from '../theme/motifs';
import { useThemeStore, resolveActiveTokens } from '../theme/store';
import { ThemeSwitcher } from '../theme/ThemeSwitcher';
import { SplitPane } from './SplitPane';
import styles from './AppShell.module.css';

type RightTab = 'console' | 'problems';

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
  const runId = useRunnerStore((state) => state.runId);
  const code = useRunnerStore((state) => state.code);
  const run = useRunnerStore((state) => state.run);
  const openCommandPalette = useCommandPaletteStore((state) => state.setOpen);
  const [rightTab, setRightTab] = useState<RightTab>('console');
  const problemsCount = useProblemsCount();

  return (
    <>
      <ThemeMotif motif={tokens.motif} />
      <div className={styles.stage}>
        <ThemeSwitcher />
        <div className={styles.shell}>
          <header className={styles.header}>
            <div className={styles.logo}>
              coding<b>▪</b>playground
            </div>
            <div className={styles.spacer} />
            <PackagesPanel />
            <CompilerOptionsPanel />
            <SharingPanel />
            <button
              type="button"
              className={styles.kbd}
              onClick={() => openCommandPalette(true)}
              aria-label="Open command palette"
            >
              ⌘K
            </button>
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
                  <TabButton
                    active={rightTab === 'problems'}
                    onClick={() => setRightTab('problems')}
                  >
                    Problems{problemsCount > 0 ? ` (${problemsCount})` : ''}
                  </TabButton>
                </div>
                <div className={styles.rightBody}>
                  <div
                    style={{ display: rightTab === 'console' ? 'block' : 'none', height: '100%' }}
                  >
                    <ConsolePanel />
                  </div>
                  <div
                    style={{
                      display: rightTab === 'problems' ? 'block' : 'none',
                      height: '100%',
                    }}
                  >
                    <ProblemsPanel />
                  </div>
                </div>
              </div>
            }
          />
          <RuntimeFrame runId={runId} code={code} />
          <footer className={styles.footer}>
            <span>index.ts</span>
            <span>{tokens.name}</span>
          </footer>
        </div>
      </div>
      <CommandPalette />
      <SettingsModal />
    </>
  );
}
