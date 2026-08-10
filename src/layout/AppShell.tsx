import { lazy, Suspense, useState, type ReactNode } from 'react';
import { CommandPalette } from '../commandPalette/CommandPalette';
import { useCommandPaletteStore } from '../commandPalette/store';
import { ProblemsPanel } from '../editor/ProblemsPanel';
import { useProblemsCount } from '../editor/diagnostics';
import { ConsolePanel } from '../execution/ConsolePanel';
import { RuntimeFrame } from '../execution/RuntimeFrame';
import { useRunnerStore } from '../execution/runnerStore';
import { PackagesPanel } from '../packages/PackagesPanel';
import { CompilerOptionsPanel } from '../settings/CompilerOptionsPanel';
import { SettingsModal } from '../settings/SettingsModal';
import { useSettingsModalStore } from '../settings/settingsModalStore';
import { SharingPanel } from '../sharing/SharingPanel';
import { ThemeMotif } from '../theme/motifs';
import { useThemeStore, resolveActiveTokens } from '../theme/store';
import { ThemeSwitcher } from '../theme/ThemeSwitcher';
import { SplitPane } from './SplitPane';
import { useIsNarrowViewport } from './useIsNarrowViewport';
import styles from './AppShell.module.css';

// Monaco (plus its language service and Prettier) accounts for most of the app's JS weight.
// Lazy-loading it means the shell (header, panels, theme) paints and becomes interactive
// immediately, with the editor itself streaming in right behind — instead of one monolithic bundle
// blocking first render on the whole thing.
const MonacoEditor = lazy(() =>
  import('../editor/MonacoEditor').then((module) => ({ default: module.MonacoEditor })),
);

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

function NarrowViewportNotice() {
  return (
    <main className={styles.narrowNotice}>
      <h1 className={styles.narrowNoticeLogo}>
        coding<b>▪</b>playground
      </h1>
      <p>
        This playground needs a wider screen — the editor, run output, and panels don't fit
        comfortably below about 800px. Try a laptop or desktop browser window.
      </p>
    </main>
  );
}

export function AppShell() {
  const tokens = useThemeStore(resolveActiveTokens);
  const runId = useRunnerStore((state) => state.runId);
  const code = useRunnerStore((state) => state.code);
  const run = useRunnerStore((state) => state.run);
  const openCommandPalette = useCommandPaletteStore((state) => state.setOpen);
  const openSettings = useSettingsModalStore((state) => state.setOpen);
  const [rightTab, setRightTab] = useState<RightTab>('console');
  const problemsCount = useProblemsCount();
  const narrow = useIsNarrowViewport();

  if (narrow) {
    return (
      <>
        <ThemeMotif motif={tokens.motif} />
        <NarrowViewportNotice />
      </>
    );
  }

  return (
    <>
      <ThemeMotif motif={tokens.motif} />
      <div className={styles.stage}>
        <ThemeSwitcher />
        <main className={styles.shell}>
          <header className={styles.header}>
            <h1 className={styles.logo}>
              coding<b>▪</b>playground
            </h1>
            <div className={styles.spacer} />
            <PackagesPanel />
            <CompilerOptionsPanel />
            <SharingPanel />
            <button
              type="button"
              className={styles.kbd}
              onClick={() => openSettings(true)}
              aria-label="Open settings"
            >
              ⚙ Settings
            </button>
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
                <Suspense fallback={<div className={styles.editorLoading}>Loading editor…</div>}>
                  <MonacoEditor />
                </Suspense>
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
        </main>
      </div>
      <CommandPalette />
      <SettingsModal />
    </>
  );
}
