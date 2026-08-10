import { useEffect, useRef } from 'react';
import { useSettingsModalStore } from './settingsModalStore';
import { useEditorSettingsStore } from './editorSettingsStore';
import { FONT_SIZE_OPTIONS, TAB_SIZE_OPTIONS } from './editorSettings';
import { clearLocalData, exportSettings, importSettingsFromText } from './localData';
import styles from './SettingsModal.module.css';

const SHORTCUTS: { key: string; label: string }[] = [
  { key: '⌘K', label: 'Command Palette' },
  { key: '⌘⏎', label: 'Run Code' },
  { key: '⇧⌥F', label: 'Format Document' },
  { key: 'Esc', label: 'Close dialogs' },
];

export function SettingsModal() {
  const open = useSettingsModalStore((state) => state.open);
  const setOpen = useSettingsModalStore((state) => state.setOpen);
  const fontSize = useEditorSettingsStore((state) => state.fontSize);
  const tabSize = useEditorSettingsStore((state) => state.tabSize);
  const wordWrap = useEditorSettingsStore((state) => state.wordWrap);
  const minimap = useEditorSettingsStore((state) => state.minimap);
  const lineNumbers = useEditorSettingsStore((state) => state.lineNumbers);
  const setOption = useEditorSettingsStore((state) => state.setOption);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={() => setOpen(false)}>
      <div className={styles.panel} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>Settings</div>
          <button
            type="button"
            className={styles.close}
            onClick={() => setOpen(false)}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Editor</div>
          <label className={styles.row}>
            Font size
            <select
              value={fontSize}
              onChange={(event) => setOption('fontSize', Number(event.target.value))}
            >
              {FONT_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}px
                </option>
              ))}
            </select>
          </label>
          <label className={styles.row}>
            Tab size
            <select
              value={tabSize}
              onChange={(event) => setOption('tabSize', Number(event.target.value) as 2 | 4)}
            >
              {TAB_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} spaces
                </option>
              ))}
            </select>
          </label>
          <label className={styles.row}>
            Word wrap
            <input
              type="checkbox"
              checked={wordWrap}
              onChange={(event) => setOption('wordWrap', event.target.checked)}
            />
          </label>
          <label className={styles.row}>
            Minimap
            <input
              type="checkbox"
              checked={minimap}
              onChange={(event) => setOption('minimap', event.target.checked)}
            />
          </label>
          <label className={styles.row}>
            Line numbers
            <input
              type="checkbox"
              checked={lineNumbers}
              onChange={(event) => setOption('lineNumbers', event.target.checked)}
            />
          </label>
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
          <div className={styles.sectionTitle}>Data</div>
          <div className={styles.dataActions}>
            <button type="button" className={styles.actionButton} onClick={exportSettings}>
              Export settings
            </button>
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => fileInputRef.current?.click()}
            >
              Import settings
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                importSettingsFromText(await file.text());
              }}
            />
            <button
              type="button"
              className={`${styles.actionButton} ${styles.danger}`}
              onClick={() => {
                if (window.confirm('Clear all locally saved settings and reload?')) {
                  clearLocalData();
                }
              }}
            >
              Clear local data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
