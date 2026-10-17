import { describe, expect, it } from 'vitest';
import { pickCompilerOptions } from './compilerOptions';

describe('pickCompilerOptions', () => {
  it('keeps known keys whose values have the right type', () => {
    expect(pickCompilerOptions({ target: 'ES2020', strict: false, noUnusedLocals: true })).toEqual({
      target: 'ES2020',
      strict: false,
      noUnusedLocals: true,
    });
  });

  it('drops a target outside the curated list', () => {
    expect(pickCompilerOptions({ target: 'ES3' })).toEqual({});
  });

  it('drops boolean options given a non-boolean value', () => {
    expect(pickCompilerOptions({ strict: 'no', esModuleInterop: 1 })).toEqual({});
  });

  it('drops unknown keys', () => {
    expect(pickCompilerOptions({ module: 'CommonJS', jsx: 'react' })).toEqual({});
  });

  it('ignores inherited properties', () => {
    const input = Object.create({ strict: false }) as object;
    expect(pickCompilerOptions(input)).toEqual({});
  });

  it.each([null, undefined, 'strict', 42, ['ES2020']])('returns nothing for %j', (input) => {
    expect(pickCompilerOptions(input)).toEqual({});
  });
});
