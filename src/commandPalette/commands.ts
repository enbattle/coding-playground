import { useEditorStore } from '../editor/store';
import { useFormatCommandStore } from '../editor/formatCommand';
import { useExecutionStore } from '../execution/store';
import { useRunnerStore } from '../execution/runnerStore';
import { CODE_EXAMPLES } from '../onboarding/examples';
import { useEditorSettingsStore } from '../settings/editorSettingsStore';
import { useSettingsModalStore } from '../settings/settingsModalStore';

export interface Command {
  id: string;
  label: string;
  shortcut?: string;
  keywords?: string[];
  run: () => void;
}

const EXAMPLE_COMMANDS: Command[] = CODE_EXAMPLES.map((example) => ({
  id: `example:${example.id}`,
  label: `Load Example: ${example.name}`,
  keywords: ['example', 'sample', 'onboarding'],
  // setContent alone is enough to update the visible editor too — MonacoEditor.tsx subscribes to
  // this store and pushes external content changes into the live model (see AGENTS.md's Monaco
  // notes), and routes them through pushEditOperations so this stays undo-able with ⌘Z.
  run: () => useEditorStore.getState().setContent(example.code),
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
    ...EXAMPLE_COMMANDS,
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
