# pinecall/console

The console: ONE browser page, built here and served by the runtime's gateway at its name, both
worlds in it — production and the sandbox — on one sign-in.
Reply to the human in Spanish; code, comments, commit messages and this file in English.

This repo builds a bundle and publishes nothing to npm; it has no version and no tag.
What ships of the console is `apps/console/dist/`, copied into the gateway by the runtime's
`scripts/console` and carried to a box by `make deploy` from the runtime's checkout.

It is a pnpm workspace: `apps/console` is the page and `packages/core` (`@pinecall/core`) is what
it stands on. Pinecall's supervisor app and its notifier live in a private repository of their
own, side by side with this one, and take `packages/core` from here: a change to core is a change
to them too, so its exports are a contract.

## Workflow

```bash
pnpm install                  # every package here, and the wire from the repo next door
pnpm lint                     # tsc against the DOM, per package — the gate, as there are no UI suites
pnpm test                     # what a page can be held to in node: an absence, a shape, a fold
pnpm build                    # vite → apps/console/dist/ (the core is source: nothing to build)
pnpm check                    # every package's own check, core first — what CI runs
pnpm --filter @pinecall/console check     # one package: build → lint → test, in that order
pnpm --filter @pinecall/core exec vitest run test/the-stream-reads-sse-by-hand.test.ts
```

To see it in a browser, `pnpm --filter @pinecall/console dev` serves this checkout at
`localhost:5173` with the gateway's paths forwarded to production (`PINECALL_BOX` names another
box): sign in there as on the box. A gateway serving the built bundle is the other way: from the
runtime's checkout, `scripts/console && pinecall-runtime gateway`, then open the gateway's own URL. **A change here
reaches a box only through that copy** — until `scripts/console` runs, the box serves the bundle it
was deployed with, whatever this checkout says.

## Structure

- `apps/console/src/` — the page: `main.tsx` boots it, `router.tsx` routes it, and under it
  `shell/` (the frame: sidebar, top bar, switcher, palette) · `screens/` (one directory per screen,
  imported by its directory and never by a file inside it) · `lib/` (the page's own reading of the
  gateway: the world, the whoami, the org, the corners, the formats) ·
  `ui/` (the design system: every control, and `ui.css`). Its `vite.config.ts` builds `dist/`.
- `packages/core/src/` — what any supervisor app stands on, imported as `@pinecall/core/<module>`
  and taken as SOURCE by the app's bundler (nothing here is compiled): `api.ts` (the fetch, the one
  place a header is spelled), `credentials.tsx`, `the-floor.ts` (`/.well-known/pinecall`, read
  before any key), `theme.ts`, `login.ts`, `session-key.ts`, `whoami.ts` (who a key is, and the
  org's word), `members.ts` (an org's people, the `team` door), `agents.ts` (the agents held now,
  `GET /v1/agents`), `initials.ts`, the SSE reader `stream.ts` and the hooks over it (`use-call`,
  `use-floor`, `use-agent-sessions`, `log-pages`), the seat and the two that spend one
  (`use-listen`, `use-supervise`), `verbs.ts` (one verb onto a call, the desk's and the phone's),
  `calls.ts` (a row said the same in every app: live, wants a person, elapsed, who, a web
  visitor's short id, the cut by day, and whether a call is spoken or typed), `calls-search.ts` (a list's search: the sessions door's
  `q`/`before` paging when it answers a `total`, else by hand over the rows held),
  `metrics.ts`/`wire.ts`/`score.ts`, `scopes.ts`, and the palette `tokens.css`. What core may not
  know: the router, `mode.ts`, the shell, a screen — a module that needs one of them
  is the console's. Its `package.json` `exports` is the list.
- **What an app tells the core at its boot**, and nothing else is configured: WHERE THE GATEWAY IS —
  `Credentials.base`, the value every hook reads from context, and the same string handed to the
  doors that take no key (`login.ts`, `the-floor.ts`); `api.ts:gatewayUrl` builds every URL from
  it. The console says `"/"` (`lib/base.ts`), resolved against the page's own origin. WHERE THE KEY
  IS KEPT — `sessionKeyIn(storage)`, a `KeyStorage` of three async calls (the console's is
  `localStorage`, in `lib/session-key.ts`). WHAT IT CALLS ITSELF — the `device` every login takes,
  the label the key carries in the org's key list (`lib/device.ts`: `"console"`).
- `test/` in each package mirrors its source · `apps/*/test/pages/` is what holds for each bundle
  itself

## The one table

`apps/console/src/lib/mode.ts` is the architecture of this page: which world it is looking at, and
**the table of screens** — the org's, the box's and an agent's — each row
saying which worlds have it. A screen with no `under` is a row of the sidebar; one that names
another is a tab of that row, drawn by the tab bar over it (`shell/screen-tabs.tsx`). The sidebar
and the tab bar draw that table and the router routes it, so a screen a console does not have is
neither linked nor reachable by typing its path. A redesign moves rows there and nothing else.

**The world is this browser's choice, read once per page.** One gateway holds both worlds and a
person's key opens both (production only where their org lets them). `lib/mode.ts` reads the world
this browser last chose (`production` until it chose), every request names it in `pinecall-env`,
and the switcher's chips keep the other and open the page again at its root — so no screen holds
one world's data under the other's name. One sign-in, one card, for both.

## Rules the tests enforce

- **No key outside the console's `lib/session-key.ts`, and no header written by hand.** One key —
  the person's — in `localStorage`, through that file alone (core's `session-key.ts` names it and
  never touches a storage); core's `api.ts:headersFor` puts it on every request
  with the world and the corner. Each of the box's names is its own origin and so its own key.
- **The bundle carries no credential.** `apps/console/test/pages/the-key-is-never-in-the-page.test.ts` builds
  the page and greps what vite wrote: a key-shaped string or an environment key's name fails it.
- One stylesheet per screen directory, and one class prefix per stylesheet.
- No file over 400 lines. Every file opens with a line saying what it is.
- A door's shape is the runtime's own: `apps/console/test/the-org-doors-are-the-runtimes-shapes.test.ts`
  parses the answer with the wire's schema, never with a hand-written one.
- **The wire is core's own** (`packages/core/src/wire/`): the runtime's shapes this page reads, and
  nothing it does not, and the reducer the call screens fold a log with. No package of the
  runtime's is read. `packages/core/test/the-log-folds-as-the-runtime-folds-it.test.ts` holds the
  reducer to the runtime's golden log (`test/golden/`, copied from its `tests/wire/golden/`): a
  change of the runtime's wire moves these files by hand, in the same change.

## What a review comes back to

One definition per thing — `grep` before writing a constant, a helper, a formatter. No dead code:
a screen removed from the table is a screen deleted in the same commit. One idea per file, named by
the idea. A stale comment is a bug. Names are sentences; 150 lines is the norm. Tests read as
sentences, and there are no UI suites: `tsc` against the DOM and a clean build are the gates.

## Traps

- **This page may never import the framework.** It knows its core, react, react-router,
  livekit-client, zod, vite and `@radix-ui/react-select` (the kit's `Select`: a menu the page draws
  in its own palette, which a native `<select>` cannot be), and nothing of `pinecall/agents`: none of the class, the views or
  the bridge would run in a browser.
- **An import nobody uses is a branch nobody wrote.** A feature once shipped half-made: one half
  went out, the half that ANSWERED it was never inserted — an edit that matched nothing and said so
  to no one — and the imports it needed sat there unused while the typecheck and the suite both
  passed. `noUnusedLocals` is on in
  every package, so tsc refuses the next one.
- **The widget tag and the SSO redirect must never name the sandbox.** Both ask
  `lib/mode.ts:theBoxsOwnName()`, which is this origin on production's console and the other
  console's on the sandbox's — a site handed the sandbox's name would load its widget from the
  workshop.
- **The bundle is not reproducible across installs.** vite's minifier (rolldown) is a transitive
  dependency, and a fresh install resolved 1.2.9 where the agents repo had 1.2.7: same sources,
  same production build, output 7% larger and shaped differently. Measured 2026-09-21. The
  lockfile is what makes a build repeatable — commit it, and bump on purpose.

## Commits

A subject line and a body that says why. `pnpm check` exits 0 before a commit.
