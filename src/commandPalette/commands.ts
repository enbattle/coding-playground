import { useFormatCommandStore } from '../editor/formatCommand';
import { useExecutionStore } from '../execution/store';
import { useRunnerStore } from '../execution/runnerStore';
import { useEditorSettingsStore } from '../settings/editorSettingsStore';
import { useSettingsModalStore } from '../settings/settingsModalStore';
import { THEME_PRESETS, type PresetThemeId } from '../theme/presets';
import { useThemeStore } from '../theme/store';

export interface Command {
  id: string;
  label: string;
  shortcut?: string;
  keywords?: string[];
  run: () => void;
}

const THEME_COMMANDS: Command[] = (Object.keys(THEME_PRESETS) as PresetThemeId[]).map((id) => ({
  id: `theme:${id}`,
  label: `Switch to ${THEME_PRESETS[id].name}`,
  keywords: ['theme'],
  run: () => useThemeStore.getState().setPreset(id),
}));

function toggleEditorSetting(key: 'wordWrap' | 'minimap' | 'lineNumbers'): () => void {
  return () => {
    const store = useEditorSettingsStore.getState();
    store.setOption(key, !store[key]);
  };
}

export function getCommands(): Command[] {
  return [
    {
      id: 'run',
      label: 'Run Code',
      shortcut: '⌘⏎',
      run: () => void useRunnerStore.getState().run(),
    },
    {
      id: 'format',
      label: 'Format Document',
      shortcut: '⇧⌥F',
      keywords: ['prettier'],
      run: () => useFormatCommandStore.getState().request(),
    },
    {
      id: 'clear-console',
      label: 'Clear Console',
      run: () => useExecutionStore.getState().clear(),
    },
    {
      id: 'open-settings',
      label: 'Open Settings',
      run: () => useSettingsModalStore.getState().setOpen(true),
    },
    {
      id: 'toggle-word-wrap',
      label: 'Toggle Word Wrap',
      run: toggleEditorSetting('wordWrap'),
    },
    {
      id: 'toggle-minimap',
      label: 'Toggle Minimap',
      run: toggleEditorSetting('minimap'),
    },
    {
      id: 'toggle-line-numbers',
      label: 'Toggle Line Numbers',
      run: toggleEditorSetting('lineNumbers'),
    },
    ...THEME_COMMANDS,
  ];
}

export function filterCommands(commands: Command[], query: string): Command[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return commands;
  return commands.filter((command) => {
    const haystack = [command.label, ...(command.keywords ?? [])].join(' ').toLowerCase();
    return haystack.includes(normalized);
  });
}
