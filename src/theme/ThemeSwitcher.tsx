import { useEffect, useRef, useState } from 'react';
import { THEME_PRESETS, type PresetThemeId } from './presets';
import { useThemeStore, resolveActiveTokens } from './store';
import styles from './ThemeSwitcher.module.css';

const PRESET_IDS = Object.keys(THEME_PRESETS) as PresetThemeId[];

/**
 * A floating pill anchored to the shell's top-right corner (see .stage/.themeDock in
 * AppShell.module.css), not inline header chrome — deliberately moved out of the header so it
 * doesn't compete with code-editing controls for space, and so it sits over the active theme's own
 * decorative motif rather than inside the bounded editor "panel."
 */
export function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const activeId = useThemeStore((state) => state.activeId);
  const setPreset = useThemeStore((state) => state.setPreset);
  const tokens = useThemeStore(resolveActiveTokens);

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
        <span className={styles.dot} style={{ background: tokens.colorAccent }} />
        {tokens.name}
        <span className={styles.chevron}>{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className={styles.menu} role="radiogroup" aria-label="Theme">
          {PRESET_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={activeId === id}
              className={activeId === id ? `${styles.option} ${styles.active}` : styles.option}
              onClick={() => {
                setPreset(id);
                setOpen(false);
              }}
            >
              <span
                className={styles.swatch}
                style={{ background: THEME_PRESETS[id].colorAccent }}
              />
              {THEME_PRESETS[id].name}
            </button>
          ))}
          {/* Wired to generateThemeFromPrompt (see ./generate.ts) once a backend endpoint exists. */}
          <button
            type="button"
            className={styles.option}
            disabled
            title="Describe-your-own-theme — coming once there's a backend to generate it"
          >
            <span className={styles.swatchEmpty} />
            Custom…
          </button>
        </div>
      )}
    </div>
  );
}
