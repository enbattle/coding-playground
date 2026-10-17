import { describe, expect, it } from 'vitest';
import { formatConsoleArgs } from './consoleFormat';

const format = (...args: unknown[]) => formatConsoleArgs(args);

describe('formatConsoleArgs', () => {
  it('prints top-level strings raw and joins arguments with spaces', () => {
    expect(format('total:', 3, true, null)).toBe('total: 3 true null');
  });

  // Plain data keeps exactly the output it had before (JSON.stringify(value, null, 2)).
  it.each([[{ a: 1, b: 'two', c: [true, null] }], [[1, [2, 3], { nested: {} }]], [{}], [[]]])(
    'formats plain data exactly as before: %j',
    (value) => {
      expect(format(value)).toBe(JSON.stringify(value, null, 2));
    },
  );

  it.each([
    ['undefined', undefined, 'undefined'],
    ['NaN', NaN, 'NaN'],
    ['-0', -0, '-0'],
    ['a bigint', 10n, '10n'],
    ['a symbol', Symbol('tag'), 'Symbol(tag)'],
    ['a named function', function greet() {}, '[Function: greet]'],
    ['an anonymous function', () => {}, '[Function (anonymous)]'],
    ['a class', class Point {}, '[class Point]'],
    ['a date', new Date(0), '1970-01-01T00:00:00.000Z'],
    ['a regexp', /ab+c/gi, '/ab+c/gi'],
  ])('shows %s instead of losing it', (_label, value, expected) => {
    expect(format(value)).toBe(expected);
  });

  it('keeps undefined inside arrays and objects', () => {
    expect(format([1, undefined])).toBe('[\n  1,\n  undefined\n]');
    expect(format({ a: undefined })).toBe('{\n  "a": undefined\n}');
  });

  it('shows Map and Set contents', () => {
    expect(format(new Map([['k', 1]]))).toBe('Map(1) {\n  "k" => 1\n}');
    expect(format(new Set([1, 2]))).toBe('Set(2) [\n  1,\n  2\n]');
    expect(format(new Map())).toBe('Map(0) {}');
  });

  it('marks circular references instead of giving up on the whole value', () => {
    const node: Record<string, unknown> = { name: 'root' };
    node.self = node;
    expect(format(node)).toBe('{\n  "name": "root",\n  "self": [Circular]\n}');
  });

  it('names class instances', () => {
    class Point {
      x = 1;
      y = 2;
    }
    expect(format(new Point())).toBe('Point {\n  "x": 1,\n  "y": 2\n}');
  });

  it('prints errors with their stack, at the top level and nested', () => {
    const error = new Error('boom');
    expect(format(error)).toBe(error.stack);
    expect(format({ error })).toContain('Error: boom');
  });

  it('stops descending past a depth limit', () => {
    expect(format({ a: { b: { c: { d: { e: { f: { g: 1 } } } } } } })).toContain('[Object]');
  });

  it('is self-contained, so its source can run inside the sandbox worker', () => {
    const rebuilt = new Function(`return (${formatConsoleArgs.toString()})`)() as (
      args: unknown[],
    ) => string;
    expect(rebuilt([new Set([1]), undefined])).toBe('Set(1) [\n  1\n] undefined');
  });
});
