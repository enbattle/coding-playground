import { useEffect, useRef } from 'react';
import { useFocusTrap } from '../state/useFocusTrap';
import { applySharedPlayground } from './shareLink';
import { useSavedPlaygroundsStore } from './savedPlaygroundsStore';
import { useShareLinkPromptStore } from './shareLinkPromptStore';
import styles from './ShareLinkPrompt.module.css';

const PREVIEW_LINES = 8;

/**
 * Asks before a share link replaces code the user was working on (see `openShareLinkFromHash`).
 * Opening never loses that work either: it's saved to Saved playgrounds first. Escape, the
 * backdrop, and ✕ all mean "Keep my code" — the choice that changes nothing.
 *
 * Always mounted, like the other modals, and built from the same pieces: backdrop, focus trap,
 * Escape-to-close, theme tokens only.
 */
export function ShareLinkPrompt() {
  const pending = useShareLinkPromptStore((state) => state.pending);
  const setPending = useShareLinkPromptStore((state) => state.setPending);
  const panelRef = useRef<HTMLDivElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const open = pending !== null;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPending(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, setPending]);

  useFocusTrap(open, panelRef);

  useEffect(() => {
    if (open) openButtonRef.current?.focus();
  }, [open]);

  if (!pending) return null;

  const keepMine = () => setPending(null);
  const openShared = () => {
    useSavedPlaygroundsStore.getState().save(`Before shared link · ${new Date().toLocaleString()}`);
    applySharedPlayground(pending);
    setPending(null);
  };

  const lines = pending.code.split('\n');
  const hiddenLines = lines.length - PREVIEW_LINES;

  return (
    <div className={styles.backdrop} onClick={keepMine}>
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-link-prompt-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div id="share-link-prompt-title" className={styles.title}>
            Open shared code?
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={keepMine}
            aria-label="Close, keeping my code"
          >
            ✕
          </button>
        </div>

        <p className={styles.intro}>
          This link replaces the code you were working on. Your current code is saved to{' '}
          <b>Saved playgrounds</b> first (under Share), so you can load it back anytime.
        </p>

        <div className={styles.sectionTitle}>Shared code</div>
        <pre className={styles.preview}>
          {lines.slice(0, PREVIEW_LINES).join('\n')}
          {hiddenLines > 0 && (
            <span className={styles.more}>
              {'\n'}… {hiddenLines} more {hiddenLines === 1 ? 'line' : 'lines'}
            </span>
          )}
        </pre>

        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={keepMine}>
            Keep my code
          </button>
          <button ref={openButtonRef} type="button" className={styles.primary} onClick={openShared}>
            Open shared code
          </button>
        </div>
      </div>
    </div>
  );
}
