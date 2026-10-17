import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME_ID, THEME_PRESETS } from './presets';
import { resolveActiveTokens } from './store';

describe('resolveActiveTokens', () => {
  it('resolves a curated preset', () => {
    expect(resolveActiveTokens({ activeId: DEFAULT_THEME_ID, customTokens: null })).toBe(
      THEME_PRESETS[DEFAULT_THEME_ID],
    );
  });

  // A persisted or imported activeId is outside data: an inherited Object property name must not
  // resolve to Object.prototype's function instead of a theme.
  it.each(['constructor', 'toString', 'no-such-theme'])(
    'falls back to the default theme for %j',
    (activeId) => {
      expect(resolveActiveTokens({ activeId: activeId as never, customTokens: null })).toBe(
        THEME_PRESETS[DEFAULT_THEME_ID],
      );
    },
  );
});
