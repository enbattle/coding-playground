import type { ThemeTokens } from './tokens';

/**
 * The curated theme set, chosen from the 5-direction design comparison. Values are carried over
 * directly from the approved mockups (docs/decisions/0004 records the token-architecture decision
 * this file is part of).
 */

const instrumentPanel: ThemeTokens = {
  id: 'instrument-panel',
  name: 'Instrument Panel',
  colorBg: '#14161a',
  colorSurface: '#1a1d24',
  colorSurface2: '#1e2128',
  colorBorder: 'rgba(255,255,255,.08)',
  colorText: '#c9cdd6',
  // #6b7280 (the original mockup value) fails WCAG AA color-contrast against every surface it's
  // rendered on in this theme (3.3-3.75:1, needs 4.5:1) — caught by the axe-core scan in
  // e2e/accessibility.spec.ts. Lightened to clear 4.5:1 against the darkest surface it appears
  // against (colorSurface2) with headroom, same hue.
  colorTextDim: '#8b90a0',
  colorTextStrong: '#e8e6de',
  colorAccent: '#7CFF9E',
  colorAccent2: '#FFB347',
  colorDanger: '#FF6B6B',
  radiusSm: '2px',
  radiusMd: '2px',
  radiusLg: '2px',
  shadow: '0 40px 80px -20px rgba(0,0,0,.6)',
  fontDisplay: 'fragment-mono',
  fontBody: 'ibm-plex-sans-condensed',
  fontMono: 'jetbrains-mono',
  trackingDisplay: '0.12em',
  transformDisplay: 'uppercase',
  motif: 'instrument-panel',
};

const terminalBotanical: ThemeTokens = {
  id: 'terminal-botanical',
  name: 'Terminal Botanical',
  colorBg: '#1A1712',
  colorSurface: '#20241d',
  colorSurface2: '#232A22',
  colorBorder: 'rgba(143,166,135,.18)',
  colorText: '#EFE7D8',
  colorTextDim: '#9CA593',
  colorTextStrong: '#EFE7D8',
  colorAccent: '#C1652C',
  colorAccent2: '#8FA687',
  colorDanger: '#E4572E',
  radiusSm: '9px',
  radiusMd: '14px',
  radiusLg: '18px',
  shadow: '0 40px 90px -30px rgba(0,0,0,.7)',
  fontDisplay: 'zilla-slab',
  fontBody: 'work-sans',
  fontMono: 'martian-mono',
  trackingDisplay: '0em',
  transformDisplay: 'none',
  motif: 'terminal-botanical',
};

const cartographicBlueprint: ThemeTokens = {
  id: 'cartographic-blueprint',
  name: 'Cartographic Blueprint',
  colorBg: '#0B1E3D',
  colorSurface: '#0F274A',
  colorSurface2: '#15325C',
  colorBorder: '#2A5C86',
  colorText: '#EAF4F8',
  // Same WCAG AA color-contrast fix as instrument-panel's colorTextDim above — the original
  // #5D85A6 failed 4.5:1 against every surface (3.27-4.24:1).
  colorTextDim: '#86a4bc',
  colorTextStrong: '#EAF4F8',
  colorAccent: '#7FD8E8',
  colorAccent2: '#F2C572',
  colorDanger: '#FF5D73',
  radiusSm: '0px',
  radiusMd: '0px',
  radiusLg: '0px',
  shadow: '0 40px 90px -30px rgba(0,0,0,.7)',
  fontDisplay: 'big-shoulders-stencil',
  fontBody: 'public-sans',
  fontMono: 'ibm-plex-mono',
  trackingDisplay: '0.03em',
  transformDisplay: 'uppercase',
  motif: 'cartographic-blueprint',
};

export const THEME_PRESETS = {
  'instrument-panel': instrumentPanel,
  'terminal-botanical': terminalBotanical,
  'cartographic-blueprint': cartographicBlueprint,
} satisfies Record<string, ThemeTokens>;

export type PresetThemeId = keyof typeof THEME_PRESETS;

export const DEFAULT_THEME_ID: PresetThemeId = 'instrument-panel';
