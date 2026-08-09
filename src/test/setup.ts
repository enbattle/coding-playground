import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Without this, multiple `it()` blocks in one file each `render()` on top of the previous test's
// leftover DOM instead of a clean slate — harmless with one test per file (which is all this
// project had until now), but produces "multiple elements found" errors the moment a file has more
// than one render() call across its tests.
afterEach(() => {
  cleanup();
});
