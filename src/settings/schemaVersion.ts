/**
 * Shared version number for this project's persisted Zustand stores (theme, compiler options,
 * editor settings — each its own localStorage key, per AGENTS.md's "one store per concern").
 * This constant doesn't migrate anything by itself; it's the single source of truth for "what
 * version is current" so per-store `migrate` functions can't drift out of sync with each other.
 *
 * Bump this — and add real logic to the affected store's `migrate` function — only when that
 * store's persisted shape changes in a way older stored data can't just be read as-is. Until then,
 * each store's `migrate` is an unused seam, not dead code: it's what future-you edits instead of
 * having to retrofit versioning onto an unversioned store under time pressure.
 */
export const SETTINGS_SCHEMA_VERSION = 1;
