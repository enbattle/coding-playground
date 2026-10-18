import { useCallback, useRef, useState, type ReactNode } from 'react';
import styles from './SplitPane.module.css';

const MIN_RATIO = 0.25;
const MAX_RATIO = 0.75;

/**
 * Two resizable panes: side by side (the default: editor | output) or stacked (`vertical`:
 * output over notes). `secondCollapsed` shrinks the second pane to its own content height (the
 * notes header) and removes the divider, without unmounting either pane.
 */
export function SplitPane({
  first,
  second,
  orientation = 'horizontal',
  initialRatio = 0.5,
  secondCollapsed = false,
}: {
  first: ReactNode;
  second: ReactNode;
  orientation?: 'horizontal' | 'vertical';
  initialRatio?: number;
  secondCollapsed?: boolean;
}) {
  const [ratio, setRatio] = useState(initialRatio);
  const [dragging, setDragging] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const vertical = orientation === 'vertical';

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      setDragging(true);

      const wrap = wrapRef.current;
      if (!wrap) return;

      const onMove = (moveEvent: PointerEvent) => {
        const rect = wrap.getBoundingClientRect();
        const next = vertical
          ? (moveEvent.clientY - rect.top) / rect.height
          : (moveEvent.clientX - rect.left) / rect.width;
        setRatio(Math.min(MAX_RATIO, Math.max(MIN_RATIO, next)));
      };
      const onUp = () => {
        setDragging(false);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [vertical],
  );

  return (
    <div ref={wrapRef} className={vertical ? `${styles.wrap} ${styles.vertical}` : styles.wrap}>
      <div
        className={styles.pane}
        style={secondCollapsed ? { flex: '1 1 0' } : { flexBasis: `${ratio * 100}%` }}
      >
        {first}
      </div>
      {!secondCollapsed && (
        <div
          className={dragging ? `${styles.divider} ${styles.dragging}` : styles.divider}
          onPointerDown={onPointerDown}
          role="separator"
          // ARIA describes the divider's own direction: stacked panes have a horizontal one.
          aria-orientation={vertical ? 'horizontal' : 'vertical'}
          aria-label="Resize panels"
        />
      )}
      <div
        className={styles.pane}
        style={secondCollapsed ? { flex: 'none' } : { flexBasis: `${(1 - ratio) * 100}%` }}
      >
        {second}
      </div>
    </div>
  );
}
