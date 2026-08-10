import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom has no layout engine, so it doesn't implement matchMedia at all (see AGENTS.md's Monaco
// integration notes — this is the same gap that keeps Monaco from mounting under jsdom). Always
// reports "no match" here, which is the right default for tests: it exercises the same code path a
// real browser would on a normal-width screen, without needing jsdom to actually evaluate the query.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }),
});

// Without this, multiple `it()` blocks in one file each `render()` on top of the previous test's
// leftover DOM instead of a clean slate — harmless with one test per file (which is all this
// project had until now), but produces "multiple elements found" errors the moment a file has more
// than one render() call across its tests.
afterEach(() => {
  cleanup();
});
