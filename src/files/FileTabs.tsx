import { useRef, useState } from 'react';
import { ENTRY_PATH, useFilesStore } from './store';
import styles from './FileTabs.module.css';

function basename(path: string): string {
  return path.slice(1);
}

function NameInput({
  initialValue,
  autoWidth,
  onCommit,
  onCancel,
}: {
  initialValue: string;
  autoWidth?: boolean;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const committedRef = useRef(false);

  const commit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    const trimmed = value.trim();
    if (trimmed && trimmed !== initialValue) onCommit(trimmed);
    else onCancel();
  };

  return (
    <input
      autoFocus
      className={autoWidth ? styles.newFileInput : styles.nameInput}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onFocus={(event) => event.target.select()}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit();
        if (event.key === 'Escape') {
          committedRef.current = true;
          onCancel();
        }
      }}
      onClick={(event) => event.stopPropagation()}
    />
  );
}

export function FileTabs() {
  const order = useFilesStore((state) => state.order);
  const activePath = useFilesStore((state) => state.activePath);
  const setActivePath = useFilesStore((state) => state.setActivePath);
  const renameFile = useFilesStore((state) => state.renameFile);
  const deleteFile = useFilesStore((state) => state.deleteFile);
  const createFile = useFilesStore((state) => state.createFile);

  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);

  return (
    <div className={styles.tabs}>
      {order.map((path) => (
        <div
          key={path}
          className={path === activePath ? `${styles.tab} ${styles.active}` : styles.tab}
          onClick={() => setActivePath(path)}
          onDoubleClick={() => path !== ENTRY_PATH && setRenamingPath(path)}
        >
          {renamingPath === path ? (
            <NameInput
              initialValue={basename(path)}
              onCommit={(value) => {
                renameFile(path, value);
                setRenamingPath(null);
              }}
              onCancel={() => setRenamingPath(null)}
            />
          ) : (
            <span>{basename(path)}</span>
          )}
          {path !== ENTRY_PATH && (
            <button
              type="button"
              className={styles.close}
              aria-label={`Delete ${basename(path)}`}
              onClick={(event) => {
                event.stopPropagation();
                deleteFile(path);
              }}
            >
              ×
            </button>
          )}
        </div>
      ))}
      {creatingNew ? (
        <NameInput
          initialValue=""
          autoWidth
          onCommit={(value) => {
            createFile(value);
            setCreatingNew(false);
          }}
          onCancel={() => setCreatingNew(false)}
        />
      ) : (
        <button
          type="button"
          className={styles.add}
          aria-label="New file"
          onClick={() => setCreatingNew(true)}
        >
          +
        </button>
      )}
    </div>
  );
}
