import { describe, expect, it } from 'vitest';
import { buildRuntimeHarness } from './sandboxHarness';

/** Every executable inline <script> element's text, as the HTML parser actually splits them. */
function inlineScripts(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(
    doc.querySelectorAll('script:not([type])'),
    (script) => script.textContent ?? '',
  );
}

describe('buildRuntimeHarness', () => {
  // `<!--` followed by `<script` switches the HTML parser into its "double escaped" script state,
  // where the harness's own closing </script> no longer ends the element — the whole bootstrap
  // then fails to parse and nothing runs, with no error surfaced anywhere.
  it.each(['</script><b>x</b>', '"<!--<script>"', '<!-- <script> --> </script>'])(
    'keeps user code containing %j inside one parseable script',
    (fragment) => {
      const scripts = inlineScripts(
        buildRuntimeHarness(`console.log(${JSON.stringify(fragment)});`),
      );
      expect(scripts).toHaveLength(1);
      expect(() => new Function(scripts[0])).not.toThrow();
    },
  );
});
