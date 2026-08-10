import { useEffect, useState } from 'react';

const QUERY = '(max-width: 799px)';

/**
 * True below the width this playground's shell (Monaco, a resizable split pane, a dense header)
 * can actually work in. Used to skip mounting the editor entirely on narrow viewports rather than
 * just hiding it with CSS — Monaco's lazy chunk and language service shouldn't be fetched at all
 * on a screen too small to use them.
 */
export function useIsNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(() => window.matchMedia(QUERY).matches);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(QUERY);
    const onChange = (event: MediaQueryListEvent) => setNarrow(event.matches);
    mediaQueryList.addEventListener('change', onChange);
    return () => mediaQueryList.removeEventListener('change', onChange);
  }, []);

  return narrow;
}
