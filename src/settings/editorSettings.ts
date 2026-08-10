export type TabSize = 2 | 4;

export interface EditorSettingValues {
  fontSize: number;
  tabSize: TabSize;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
}

export const DEFAULT_EDITOR_SETTINGS: EditorSettingValues = {
  fontSize: 14,
  tabSize: 2,
  wordWrap: false,
  minimap: false,
  lineNumbers: true,
};

export const FONT_SIZE_OPTIONS = [12, 13, 14, 15, 16, 18] as const;
export const TAB_SIZE_OPTIONS: TabSize[] = [2, 4];
