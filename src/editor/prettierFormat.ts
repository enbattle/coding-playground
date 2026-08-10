import * as prettier from 'prettier/standalone';
import typescriptPlugin from 'prettier/plugins/typescript';
import estreePlugin from 'prettier/plugins/estree';

/** Formats a TypeScript source string with Prettier, using this project's own style (AGENTS.md). */
export async function formatTypeScript(source: string): Promise<string> {
  return prettier.format(source, {
    parser: 'typescript',
    plugins: [typescriptPlugin, estreePlugin],
    semi: true,
    singleQuote: true,
    printWidth: 100,
  });
}
