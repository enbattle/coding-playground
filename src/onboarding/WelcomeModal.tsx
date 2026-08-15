import { useEffect, useRef } from 'react';
import { useEditorStore } from '../editor/store';
import { SHORTCUTS } from '../settings/shortcuts';
import { useFocusTrap } from '../state/useFocusTrap';
import { CODE_EXAMPLES } from './examples';
import { useWelcomeModalStore } from './welcomeModalStore';
import styles from './WelcomeModal.module.css';

const GUIDE_ITEMS: { glyph: string; label: string; description: string }[] = [
  {
    glyph: '▸',
    label: 'Run your code',
    description: 'Click Run in the header, or press ⌘⏎ / Ctrl+Enter from anywhere.',
  },
  {
    glyph: '⌘K',
    label: 'Open the command palette',
    description:
      'Every action — running, formatting, loading an example, flipping a setting — is a command away.',
  },
  {
    glyph: '▤',
    label: 'Add a package',
    description: 'Packages lists a curated npm allowlist and inserts the import for you.',
  },
  {
    glyph: '⚙',
    label: 'Tune the compiler and editor',
    description:
      'TS Config covers compiler options; Settings covers font size, wrapping, and more.',
  },
  {
    glyph: '⇪',
    label: 'Save or share your work',
    description:
      'Share copies a link with your code baked in, downloads the file, or saves it locally.',
  },
];

/**
 * Always mounted (like SettingsModal/CommandPalette) so its Escape-to-close effect is live from the
 * first render, and always open by default (welcomeModalStore.open starts `true`) — there's no
 * "don't show again" persistence yet, so this shows on every load until that's built.
 */
export function WelcomeModal() {
  const open = useWelcomeModalStore((state) => state.open);
  const setOpen = useWelcomeModalStore((state) => state.setOpen);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, setOpen]);

  useFocusTrap(open, panelRef);

  useEffect(() => {
    if (open) closeButtonRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const loadExample = (code: string) => {
    // setContent alone also updates the visible editor — MonacoEditor.tsx subscribes to this store
    // and pushes external content changes into the live model (see AGENTS.md's Monaco notes).
    useEditorStore.getState().setContent(code);
    setOpen(false);
  };

  return (
    <div className={styles.backdrop} onClick={() => setOpen(false)}>
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Welcome"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={styles.title}>
            Welcome to coding<b>▪</b>playground
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className={styles.close}
            onClick={() => setOpen(false)}
            aria-label="Close welcome"
          >
            ✕
          </button>
        </div>

        <p className={styles.intro}>
          A TypeScript playground that runs entirely in your browser — no backend, nothing saved
          anywhere unless you export or share it yourself.
        </p>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Get started</div>
          {GUIDE_ITEMS.map((item) => (
            <div className={styles.guideItem} key={item.label}>
              <span className={styles.glyph}>{item.glyph}</span>
              <div>
                <div className={styles.guideLabel}>{item.label}</div>
                <div className={styles.guideDescription}>{item.description}</div>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Keyboard Shortcuts</div>
          {SHORTCUTS.map((shortcut) => (
            <div className={styles.row} key={shortcut.key}>
              {shortcut.label}
              <span className={styles.shortcutKey}>{shortcut.key}</span>
            </div>
          ))}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Try an example</div>
          <div className={styles.examples}>
            {CODE_EXAMPLES.map((example) => (
              <button
                key={example.id}
                type="button"
                className={styles.exampleButton}
                onClick={() => loadExample(example.code)}
              >
                {example.name}
              </button>
            ))}
          </div>
        </div>

        <button type="button" className={styles.done} onClick={() => setOpen(false)}>
          Got it — let's code
        </button>
      </div>
    </div>
  );
}
