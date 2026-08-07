import { THEME_PRESETS, type PresetThemeId } from './presets'
import { useThemeStore } from './store'
import styles from './ThemeSwitcher.module.css'

const PRESET_IDS = Object.keys(THEME_PRESETS) as PresetThemeId[]

export function ThemeSwitcher() {
  const activeId = useThemeStore((state) => state.activeId)
  const setPreset = useThemeStore((state) => state.setPreset)

  return (
    <div className={styles.switcher} role="radiogroup" aria-label="Theme">
      {PRESET_IDS.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={activeId === id}
          className={activeId === id ? `${styles.option} ${styles.active}` : styles.option}
          onClick={() => setPreset(id)}
        >
          {THEME_PRESETS[id].name}
        </button>
      ))}
      {/* Wired to generateThemeFromPrompt (see ./generate.ts) once a backend endpoint exists. */}
      <button
        type="button"
        className={styles.option}
        disabled
        title="Describe-your-own-theme — coming once there's a backend to generate it"
      >
        Custom…
      </button>
    </div>
  )
}
