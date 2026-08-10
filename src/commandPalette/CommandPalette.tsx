import { useEffect, useMemo, useRef, useState } from 'react';
import { useCommandPaletteStore } from './store';
import { getCommands, filterCommands } from './commands';
import { useRunnerStore } from '../execution/runnerStore';
import { useFocusTrap } from '../state/useFocusTrap';
import styles from './CommandPalette.module.css';

/**
 * Always mounted (rendered unconditionally in AppShell) so its global-shortcut effect is always
 * active, regardless of whether the palette itself is currently open — ⌘Enter must Run from
 * anywhere, not just while the palette happens to be visible.
 */
export function CommandPalette() {
  const open = useCommandPaletteStore((state) => state.open);
  const query = useCommandPaletteStore((state) => state.query);
  const setOpen = useCommandPaletteStore((state) => state.setOpen);
  const setQuery = useCommandPaletteStore((state) => state.setQuery);
  const toggle = useCommandPaletteStore((state) => state.toggle);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const commands = useMemo(() => filterCommands(getCommands(), query), [query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        toggle();
      } else if (meta && event.key === 'Enter') {
        event.preventDefault();
        void useRunnerStore.getState().run();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggle]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useFocusTrap(open, panelRef);

  if (!open) return null;

  const runActive = () => {
    const command = commands[activeIndex];
    if (!command) return;
    command.run();
    setOpen(false);
  };

  return (
    <div className={styles.backdrop} onClick={() => setOpen(false)}>
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          ref={inputRef}
          className={styles.input}
          placeholder="Type a command…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActiveIndex((index) => Math.min(index + 1, commands.length - 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            } else if (event.key === 'Enter') {
              event.preventDefault();
              runActive();
            } else if (event.key === 'Escape') {
              setOpen(false);
            }
          }}
        />
        <div className={styles.list} role="listbox" aria-label="Commands">
          {commands.length === 0 && <div className={styles.empty}>No matching commands.</div>}
          {commands.map((command, index) => (
            <button
              key={command.id}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={index === activeIndex ? `${styles.item} ${styles.active}` : styles.item}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => {
                command.run();
                setOpen(false);
              }}
            >
              <span>{command.label}</span>
              {command.shortcut && <span className={styles.shortcut}>{command.shortcut}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
