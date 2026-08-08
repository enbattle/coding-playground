import type { MotifKey } from './tokens';

/**
 * The handful of signature visual details that make each curated theme memorable — scanlines,
 * branch traces, survey-grid corners — are deliberately kept out of the shared token system and
 * live here instead, one component per motif. Collapsing these into generic tokens would flatten
 * out exactly what makes each theme distinctive; everything else in the app (layout, spacing,
 * every component) is shared and token-driven, only this decorative layer is theme-specific.
 *
 * A future AI-generated theme (see ./generate.ts) has no bespoke art of its own — it renders with
 * `motif: 'none'`, which is intentional: text-derived themes get the shared token styling without
 * pretending to have hand-designed decoration.
 */

function InstrumentPanelMotif() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        backgroundImage:
          'repeating-linear-gradient(0deg, rgba(255,255,255,.015) 0px, rgba(255,255,255,.015) 1px, transparent 1px, transparent 3px)',
      }}
    />
  );
}

function TerminalBotanicalMotif() {
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 30% -10%, rgba(38,48,31,.6) 0%, transparent 55%)',
        }}
      />
      <svg
        viewBox="0 0 1180 500"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.08 }}
      >
        <path
          d="M0 500 C 150 380, 120 300, 260 260 C 380 230, 340 140, 460 90"
          stroke="#8FA687"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M260 260 C 300 300, 380 320, 420 380"
          stroke="#8FA687"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M1180 60 C 1000 120, 980 200, 840 220 C 740 235, 760 320, 660 360"
          stroke="#C1652C"
          strokeWidth="2"
          fill="none"
        />
      </svg>
    </div>
  );
}

function CartographicBlueprintMotif() {
  const corner = (transform: string) => (
    <svg
      viewBox="0 0 64 64"
      style={{ position: 'absolute', width: 64, height: 64, opacity: 0.5, transform }}
    >
      <circle cx="32" cy="32" r="20" fill="none" stroke="#7FD8E8" strokeWidth="1" />
      <line x1="0" y1="32" x2="64" y2="32" stroke="#7FD8E8" strokeWidth="1" />
      <line x1="32" y1="0" x2="32" y2="64" stroke="#7FD8E8" strokeWidth="1" />
    </svg>
  );

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(127,216,232,.07) 0 1px, transparent 1px 32px),' +
            'repeating-linear-gradient(90deg, rgba(127,216,232,.07) 0 1px, transparent 1px 32px)',
        }}
      />
      <div style={{ position: 'absolute', top: 16, left: 16 }}>{corner('none')}</div>
      <div style={{ position: 'absolute', bottom: 16, right: 16 }}>{corner('rotate(180deg)')}</div>
    </div>
  );
}

const MOTIF_REGISTRY: Record<MotifKey, React.ComponentType> = {
  'instrument-panel': InstrumentPanelMotif,
  'terminal-botanical': TerminalBotanicalMotif,
  'cartographic-blueprint': CartographicBlueprintMotif,
  none: () => null,
};

export function ThemeMotif({ motif }: { motif: MotifKey }) {
  const Motif = MOTIF_REGISTRY[motif];
  return <Motif />;
}
