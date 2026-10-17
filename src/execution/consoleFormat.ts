/**
 * Formats `console.*` arguments into the one line of text the console panel shows.
 *
 * Runs inside the sandbox worker: sandboxHarness.ts embeds this function's *source*
 * (`formatConsoleArgs.toString()`), so it must stay self-contained — no imports, no references to
 * anything outside its own body except built-in globals. A unit test rebuilds it from its source to
 * keep that true.
 *
 * Plain data (objects, arrays, strings, numbers, booleans, null) prints exactly as the old
 * `JSON.stringify(value, null, 2)` did. Everything JSON silently mangled now shows what it is:
 * `undefined` (was an empty line, or `null` in arrays), Map/Set contents (were `{}`), functions and
 * classes (were blank), bigint and symbols, `[Circular]` (made the whole value `[object Object]`),
 * class instance names, NaN/-0, dates and regexps.
 */
export function formatConsoleArgs(args: unknown[]): string {
  const MAX_DEPTH = 5;
  const pad = (depth: number) => '  '.repeat(depth);
  const block = (open: string, close: string, items: string[], depth: number) =>
    items.length === 0
      ? open + close
      : `${open}\n${items.map((item) => pad(depth + 1) + item).join(',\n')}\n${pad(depth)}${close}`;

  // `ancestors` holds only the objects on the current path, so a value referenced twice side by
  // side prints twice; only a value that contains itself prints as [Circular].
  const formatValue = (value: unknown, depth: number, ancestors: Set<object>): string => {
    if (typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'number') return Object.is(value, -0) ? '-0' : String(value);
    if (typeof value === 'bigint') return `${value}n`;
    if (typeof value === 'symbol') return value.toString();
    if (typeof value === 'function') {
      if (Function.prototype.toString.call(value).startsWith('class')) {
        return `[class ${value.name || '(anonymous)'}]`;
      }
      return value.name ? `[Function: ${value.name}]` : '[Function (anonymous)]';
    }
    if (value === null || typeof value !== 'object') return String(value);
    if (value instanceof Error) return value.stack || `${value.name}: ${value.message}`;
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? 'Invalid Date' : value.toISOString();
    }
    if (value instanceof RegExp) return String(value);
    if (ancestors.has(value)) return '[Circular]';
    if (depth >= MAX_DEPTH) return Array.isArray(value) ? '[Array]' : '[Object]';

    ancestors.add(value);
    try {
      const child = (item: unknown) => formatValue(item, depth + 1, ancestors);
      if (Array.isArray(value)) return block('[', ']', value.map(child), depth);
      if (value instanceof Map) {
        const entries = [...value].map(([key, item]) => `${child(key)} => ${child(item)}`);
        return block(`Map(${value.size}) {`, '}', entries, depth);
      }
      if (value instanceof Set)
        return block(`Set(${value.size}) [`, ']', [...value].map(child), depth);

      const proto: unknown = Object.getPrototypeOf(value);
      const constructorName =
        proto && proto !== Object.prototype
          ? (proto as { constructor?: { name?: string } }).constructor?.name
          : '';
      const entries = Object.keys(value).map(
        (key) => `${JSON.stringify(key)}: ${child((value as Record<string, unknown>)[key])}`,
      );
      return block(constructorName ? `${constructorName} {` : '{', '}', entries, depth);
    } finally {
      ancestors.delete(value);
    }
  };

  return args
    .map((arg) => (typeof arg === 'string' ? arg : formatValue(arg, 0, new Set())))
    .join(' ');
}
