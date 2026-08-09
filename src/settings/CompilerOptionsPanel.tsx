import { useEffect, useRef, useState } from 'react';
import { useCompilerOptionsStore } from './compilerOptionsStore';
import { TARGET_OPTIONS, type CompilerOptionValues } from './compilerOptions';
import styles from './CompilerOptionsPanel.module.css';

type BooleanOptionKey = {
  [K in keyof CompilerOptionValues]: CompilerOptionValues[K] extends boolean ? K : never;
}[keyof CompilerOptionValues];

const BOOLEAN_OPTIONS: { key: BooleanOptionKey; label: string }[] = [
  { key: 'strict', label: 'strict' },
  { key: 'esModuleInterop', label: 'esModuleInterop' },
  { key: 'experimentalDecorators', label: 'experimentalDecorators' },
  { key: 'noUnusedLocals', label: 'noUnusedLocals' },
  { key: 'noUnusedParameters', label: 'noUnusedParameters' },
];

export function CompilerOptionsPanel() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const target = useCompilerOptionsStore((state) => state.target);
  const setOption = useCompilerOptionsStore((state) => state.setOption);

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
        ⚙ TS Config
      </button>
      {open && (
        <div className={styles.popover} role="dialog" aria-label="TypeScript compiler options">
          <div className={styles.title}>Compiler Options</div>

          <label className={styles.row}>
            target
            <select
              value={target}
              onChange={(event) =>
                setOption('target', event.target.value as CompilerOptionValues['target'])
              }
            >
              {TARGET_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.row}>
            module
            <span className={styles.fixed} title="Fixed — execution requires ESM output (ADR 0007)">
              ESNext
            </span>
          </div>

          <hr className={styles.divider} />

          {BOOLEAN_OPTIONS.map(({ key, label }) => (
            <BooleanRow key={key} optionKey={key} label={label} />
          ))}
        </div>
      )}
    </div>
  );
}

function BooleanRow({ optionKey, label }: { optionKey: BooleanOptionKey; label: string }) {
  const value = useCompilerOptionsStore((state) => state[optionKey]);
  const setOption = useCompilerOptionsStore((state) => state.setOption);

  return (
    <label className={`${styles.row} ${styles.checkbox}`}>
      {label}
      <input
        type="checkbox"
        checked={value}
        onChange={(event) => setOption(optionKey, event.target.checked)}
      />
    </label>
  );
}
