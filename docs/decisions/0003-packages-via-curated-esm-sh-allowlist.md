# 0003 - Packages via a curated esm.sh + import-map allowlist, not arbitrary npm names

## Status

Accepted

## Context

Users need to use real packages without a backend or bundler. Native browser import maps (shipped
in all current evergreen browsers) let bare specifiers like `import { z } from "zod"` resolve to
CDN URLs. esm.sh transforms npm packages into ES modules on demand and also serves `.d.ts` types,
so both execution and Monaco IntelliSense can come from the same source with no bundler.

The open question was scope: resolve _any_ npm package name a user types, or a curated allowlist.
Arbitrary CDN code execution from a user-typed package name is a real supply-chain/XSS-adjacent
risk surface (typosquatting, a malicious or compromised package, no version pinning discipline) —
not something to default to in an MVP whose iframe sandbox is the only isolation boundary.

## Decision

Default to a curated, pinned-version allowlist (e.g. `zod`, `date-fns`, `nanoid`, `immer`,
`lodash-es`, `rxjs`) wired into the import map and surfaced in a dedicated Packages panel so users
can see exactly what's available (name, version, one-line description, docs link, one-click
insert). Ambient `.d.ts` for these packages is wired into Monaco so intellisense works without
extra user action. Arbitrary custom packages are deferred behind an explicit, off-by-default
"advanced/experimental" setting (Phase 7) rather than being the default path.

## Consequences

Users can't `import` an arbitrary npm package out of the box — only what's on the allowlist. This
is a deliberate scope and safety trade-off for the MVP, not an oversight; expanding the allowlist
is cheap (add an entry), and the experimental opt-in path exists for power users once we're ready
to accept that risk surface deliberately.
