---
name: add-a-console-screen
description: Add or change a screen of the console — production's at the root of the box's name, or the sandbox's under `/sandbox` — Chat, Calls, Sessions, Settings, Personas, Simulations, Tokens, Team and the rest. Use for any edit under apps/console/src — a route, a panel, a stylesheet, a door the page reads.
---

# A screen of the console

`apps/console/src/` is a **browser program**, standing on `packages/core` (`@pinecall/core`: the
fetch, the key's header, the stream, the call, the palette — shared with the mobile app). It has
its own laws, and three of them are held by tests written after the bug they describe. Paths below
without a package are the console's (`apps/console/src/`); `core/` is `packages/core/src/`.

## NEVER

- **Never import the framework.** The console may reach `@pinecall/core` (its wire included),
  `react`, `react-dom`, `react-router`, `livekit-client`, `zod` and vite — and nothing else. None of `agent/`, `views/`, `runtime/` or `client/` would run in a
  browser, and a build that pulled a TypeScript parser into the bundle is a build nobody notices.
- **Never touch a key outside `lib/session-key.ts`, and never write a header by hand.** A console
  keeps ONE key — the person's — in `localStorage`, through that file alone; `core/api.ts:headersFor`
  puts it on every request as a Bearer, with the world (`pinecall-env`) and the corner. Both worlds
  are one origin and so one key: signing in once signs in at both.
  `signing-out-forgets-the-key.test.ts` pins the sign-out.
- **Never ask which world a screen is in to decide what it may do.** The PATH is the world
  (`lib/mode.ts`, off its first segment: `/sandbox/…` is the sandbox's): production's console edits
  production's corner — Settings and Lexicon included, with history and rollback, and no promote
  anywhere — while the sandbox's edits your corner or the team's. A person without production access is stopped at the way in
  (`screens/login/no-production.tsx`), not screen by screen.
- **Never build a URL by hand.** `core/api.ts` is the only place a request to the gateway is
  built (`read`, `put`, and the SSE in `core/stream.ts`). Everything is relative to `API_BASE`
  (`lib/base.ts`), the origin's root — never to the router's base, which is the world's.
- **Never rename or reorder a route in `router.tsx`.** It is a seam: append, never reshuffle. And
  import a screen by its **directory** (`./screens/evals`), never a file inside it.
- **Never invent a metric name or a verdict word.** `core/metrics.ts` is the only file that names a
  metric, drawn field by field under livekit's own names; `passed` absent on `call.score` is a
  THIRD state — nobody judged — and reads as neither green nor red.

## Adding a screen

1. `screens/<name>/index.ts` — the door: `export { Name } from "./name";` and one line saying what
   is behind it. Nothing outside the directory reaches deeper than this file.
2. `screens/<name>/<name>.tsx` — the screen. Data comes from a `use-<thing>.ts` hook beside it;
   the envelope a door answers in is a zod schema in `door.ts`, parsed, never trusted.
3. `screens/<name>/<name>.css` — its own stylesheet, **and every class prefixed by the thing it
   belongs to**. Vite bundles every stylesheet into one file the whole console wears, so a class
   is global whatever directory it was written in: `.mark` was the Chat transcript's line *and*
   the Sessions timeline's cell, and a `width: 1.5em` meant for the table squeezed the paragraph
   to one character per line. `ui/ui.css` is the one deliberately shared vocabulary: a screen may dress a `.ui-` class where it stands (`.sim-check .ui-check`) and may never define one.
4. `lib/mode.ts` — one row in `ORG_SCREENS`, `BOX_SCREENS` or `AGENT_SCREENS`, saying which console has it
   (`hosted`, `local`, or both): the sidebar draws that table and `router.tsx` routes it, so a
   screen a console does not have is neither linked nor reachable. `core/scopes.ts` gates it by the
   scope that opens its doors; a screen nobody gated is open to every key (Tokens is).
5. `router.tsx` — the screen's import, by its directory, appended.

**The URL is the state.** Which agent, which screen, which call: nothing the console holds in
memory decides what is on screen, so a reload lands on exactly the same thing. The console keeps
no selection of its own — the rail is highlighted by the URL.

## Reading the log

- One call as it happens: `core/use-call.ts` — the folded state for the first paint, then every entry
  over SSE, painted ten times a second.
- A finished call, whole: `core/log-pages.ts` — page by page, oldest first, until a short page.
- A verdict: `core/score.ts` — the log **seals** on `call.score`, so on a finished call it is the
  entry at `last_seq`; read from one below it rather than paging a whole conversation.
- Anything a person reads as a sentence — a supervisor's move, a state change, a confirmation —
  goes through one function (`supervisor-mark.ts`, `timeline-rows.ts`) so every screen draws it
  the same way.

## The room, and the only livekit in this repository

Three files touch `livekit-client`: `screens/talk/use-room.ts`, `core/use-listen.ts`,
`core/use-supervise.ts`. They receive a **seat** minted through the CLI's door; the page never
holds a key and never talks to LiveKit's API. The desk sends **one** verb per gesture and asks for
**one** seat — `the-desk-sends-one-verb.test.ts` counts both, with livekit mocked.

## Verify

```bash
pnpm lint                     # tsc per package: the page and the core against the DOM
pnpm test                     # each package's suite; the key test builds its own bundle
pnpm build                    # vite → apps/console/dist, what the runtime's scripts/console ships
pnpm check                    # all three, every package — what CI runs
```

A change to the page reaches a box only through the build: the runtime's `scripts/console` copies
`apps/console/dist` into the gateway, and `make deploy` from the runtime carries it. Until then
the box serves the bundle it was deployed with, whatever a checkout says.
