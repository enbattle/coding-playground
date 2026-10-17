import { compressToEncodedURIComponent } from 'lz-string';
import { describe, expect, it } from 'vitest';
import { SAMPLE_SOURCE } from '../editor/store';
import { DEFAULT_COMPILER_OPTIONS } from '../settings/compilerOptions';
import { needsConfirmation, parseSharePayload } from './shareLink';

const encode = (payload: unknown) => compressToEncodedURIComponent(JSON.stringify(payload));

describe('parseSharePayload', () => {
  it('reads the code and validated compiler options, filling gaps with defaults', () => {
    const hash = encode({
      v: 1,
      code: 'console.log(1)',
      compilerOptions: { strict: false, target: 'ES3' },
    });
    expect(parseSharePayload(hash)).toEqual({
      code: 'console.log(1)',
      compilerOptions: { ...DEFAULT_COMPILER_OPTIONS, strict: false },
    });
  });

  it.each(['', 'not-a-share-link', encode({ v: 1 }), encode('just a string'), encode(null)])(
    'returns null for %j',
    (hash) => {
      expect(parseSharePayload(hash)).toBeNull();
    },
  );
});

describe('needsConfirmation', () => {
  it.each([
    ['the untouched sample', SAMPLE_SOURCE],
    ['an empty editor', '  \n'],
    ['the same code the link carries', 'shared code'],
  ])('does not ask when the editor holds %s', (_label, current) => {
    expect(needsConfirmation(current, 'shared code')).toBe(false);
  });

  it('asks when the editor holds different work', () => {
    expect(needsConfirmation('my own work', 'shared code')).toBe(true);
  });
});
