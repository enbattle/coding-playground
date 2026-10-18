import { useId, useState } from 'react';
import { useNotesStore } from './store';
import styles from './NotesPanel.module.css';

const PRIVACY_NOTE = 'Private to this tab: cleared when you close it, never saved or shared.';
const TIP_WIDTH = 260;
const PRIVACY_DETAIL =
  "Notes stay in this browser tab only. They survive a reload, but closing the tab deletes them. They're never saved permanently, put in share links or saved playgrounds, or sent anywhere.";

/** The collapsible notes section under the console (ADR 0014). `open` lives in AppShell, which
 * also needs it to size the split. */
export function NotesPanel({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const text = useNotesStore((state) => state.text);
  const setText = useNotesStore((state) => state.setText);
  // Where to show the tooltip, or null while it's hidden. It's `position: fixed` at the info
  // button's on-screen spot: the panel scrolls (SplitPane's overflow: auto), which clipped an
  // absolutely positioned tooltip down to a sliver.
  const [tipAt, setTipAt] = useState<{ left: number; top: number } | null>(null);
  const bodyId = useId();
  const tipId = useId();

  const showTip = (button: HTMLElement) => {
    const rect = button.getBoundingClientRect();
    setTipAt({ left: Math.min(rect.left, window.innerWidth - TIP_WIDTH - 8), top: rect.top - 6 });
  };
  const hideTip = () => setTipAt(null);

  return (
    <section className={styles.pane} aria-label="Notes">
      <div className={styles.head}>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={onToggle}
        >
          <span className={styles.chevron} aria-hidden>
            {open ? '▾' : '▸'}
          </span>
          Notes
        </button>
        <span className={styles.infoWrap}>
          <button
            type="button"
            className={styles.info}
            aria-label="About notes"
            aria-describedby={tipId}
            onMouseEnter={(event) => showTip(event.currentTarget)}
            onMouseLeave={hideTip}
            onFocus={(event) => showTip(event.currentTarget)}
            onBlur={hideTip}
            onKeyDown={(event) => {
              if (event.key === 'Escape') hideTip();
            }}
          >
            ⓘ
          </button>
          {/* Always in the DOM so aria-describedby resolves; only shown while hovered or focused. */}
          <span
            id={tipId}
            role="tooltip"
            className={styles.tip}
            hidden={!tipAt}
            style={{ width: TIP_WIDTH, left: tipAt?.left, top: tipAt?.top }}
          >
            {PRIVACY_DETAIL}
          </span>
        </span>
      </div>
      {open && (
        <div id={bodyId} className={styles.body}>
          <p className={styles.privacy}>{PRIVACY_NOTE}</p>
          <textarea
            className={styles.text}
            aria-label="Notes"
            placeholder="Jot down anything you need while you code…"
            spellCheck
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </div>
      )}
    </section>
  );
}
