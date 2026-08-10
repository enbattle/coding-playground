import { useEffect, useRef, useState } from 'react';
import { downloadCurrentCode } from './exportCode';
import { useSavedPlaygroundsStore } from './savedPlaygroundsStore';
import { buildShareUrl } from './shareLink';
import styles from './SharingPanel.module.css';

export function SharingPanel() {
  const [open, setOpen] = useState(false);
  const [copyLabel, setCopyLabel] = useState('Copy link');
  const [saveName, setSaveName] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const items = useSavedPlaygroundsStore((state) => state.items);
  const save = useSavedPlaygroundsStore((state) => state.save);
  const remove = useSavedPlaygroundsStore((state) => state.remove);
  const load = useSavedPlaygroundsStore((state) => state.load);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(buildShareUrl());
    setCopyLabel('Copied ✓');
    window.setTimeout(() => setCopyLabel('Copy link'), 1500);
  };

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        ⇪ Share
      </button>
      {open && (
        <div className={styles.popover} role="dialog" aria-label="Share and saved playgrounds">
          <div className={styles.title}>Share</div>
          <p className={styles.hint}>
            Copies a link with your current code and compiler options baked in — no account needed,
            nothing leaves your browser until someone opens the link.
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.actionButton} onClick={() => void copyLink()}>
              {copyLabel}
            </button>
            <button type="button" className={styles.actionButton} onClick={downloadCurrentCode}>
              Download .ts
            </button>
          </div>

          <div className={styles.divider} />

          <div className={styles.title}>Saved playgrounds</div>
          <form
            className={styles.saveRow}
            onSubmit={(event) => {
              event.preventDefault();
              const name = saveName.trim();
              if (!name) return;
              save(name);
              setSaveName('');
            }}
          >
            <input
              className={styles.saveInput}
              placeholder="Name this snapshot…"
              value={saveName}
              onChange={(event) => setSaveName(event.target.value)}
            />
            <button type="submit" className={styles.actionButton}>
              Save
            </button>
          </form>

          {items.length === 0 ? (
            <div className={styles.empty}>No saved playgrounds yet.</div>
          ) : (
            <div className={styles.list}>
              {items.map((item) => (
                <div key={item.id} className={styles.item}>
                  <div className={styles.itemHead}>
                    <span className={styles.name}>{item.name}</span>
                    <span className={styles.date}>
                      {new Date(item.savedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className={styles.itemFooter}>
                    <button
                      type="button"
                      className={styles.insertButton}
                      onClick={() => {
                        load(item.id);
                        setOpen(false);
                      }}
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => remove(item.id)}
                      aria-label={`Delete ${item.name}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
