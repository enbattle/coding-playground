import { useEffect, useRef, useState } from 'react';
import { PACKAGE_REGISTRY } from './registry';
import { importSnippetFor, useInsertRequestStore } from './insertRequest';
import styles from './PackagesPanel.module.css';

export function PackagesPanel() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const requestInsert = useInsertRequestStore((state) => state.request);

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

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        ▤ Packages
      </button>
      {open && (
        <div className={styles.popover} role="dialog" aria-label="Available packages">
          <div className={styles.title}>Available Packages</div>
          <div className={styles.list}>
            {PACKAGE_REGISTRY.map((pkg) => (
              <div key={pkg.name} className={styles.item}>
                <div className={styles.itemHead}>
                  <span className={styles.name}>{pkg.name}</span>
                  <span className={styles.version}>{pkg.version}</span>
                </div>
                <div className={styles.description}>{pkg.description}</div>
                <div className={styles.itemFooter}>
                  <a
                    className={styles.docsLink}
                    href={pkg.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Docs ↗
                  </a>
                  <button
                    type="button"
                    className={styles.insertButton}
                    onClick={() => {
                      requestInsert(importSnippetFor(pkg.name));
                      setOpen(false);
                    }}
                  >
                    Insert import
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
