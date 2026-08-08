import { useCallback, useRef, useState, type ReactNode } from 'react';
import styles from './SplitPane.module.css';

const MIN_RATIO = 0.25;
const MAX_RATIO = 0.75;

export function SplitPane({ left, right }: { left: ReactNode; right: ReactNode }) {
  const [ratio, setRatio] = useState(0.5);
  const [dragging, setDragging] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    event.preventDefault();
    setDragging(true);

    const wrap = wrapRef.current;
    if (!wrap) return;

    const onMove = (moveEvent: PointerEvent) => {
      const rect = wrap.getBoundingClientRect();
      const next = (moveEvent.clientX - rect.left) / rect.width;
      setRatio(Math.min(MAX_RATIO, Math.max(MIN_RATIO, next)));
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, []);

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <div className={styles.pane} style={{ flexBasis: `${ratio * 100}%` }}>
        {left}
      </div>
      <div
        className={dragging ? `${styles.divider} ${styles.dragging}` : styles.divider}
        onPointerDown={onPointerDown}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panels"
      />
      <div className={styles.pane} style={{ flexBasis: `${(1 - ratio) * 100}%` }}>
        {right}
      </div>
    </div>
  );
}
