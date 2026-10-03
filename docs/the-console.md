# The console

The console is one bundle the runtime's gateway serves at its name, with **both worlds** in it.
**Production** is what customers reach. **The sandbox** is where things are tried: your copies of the
agents, your calls, your corner of the settings. One gateway, one database and one sign-in hold both;
what keeps a test call off a production process is the worker fleet each world has.

**The world is this browser's choice**: `lib/mode.ts` reads the one it last chose (production until it
chose) when the page loads, and every request names it in `pinecall-env`. The switcher's two chips
keep the other world and open the page again at its root, so no screen ever holds one world's data
under the other's name. Which screens each console has is a table in that file —
the org's, the box's, an agent's — which the sidebar and the tab bar draw and the router routes, so
a screen a console lacks is neither linked nor reachable by its path.

| URL | screen | where |
|---|---|---|
| `/` · `/overview` · `/evals` | **Home** and its tab Agents: today, the agents held; **Evals**, how every agent is judged | both |
| `/calls[/:call]` · `/list` | **Calls**: every conversation of the org as a messenger shows them, the one open drawn as the call itself — where a live call is supervised — and the same calls as a table (`?q=` `?agent=` `?channel=` `?status=`) | both |
| `/numbers` · `/team` · `/usage` | the org's numbers, people and bill | production's |
| `/settings` → `/tokens` · `/providers` · `/apps` · `/secrets` · `/docs[/:base]` · `/memory` · `/notifications` · `/data` · `/phone` | **Settings**' tabs: this instance's tokens and vendor keys, the apps the box hosts and their secrets ([hosted-apps.md](hosted-apps.md)), every base and every fact, what you are told, the org's data ([data-and-privacy.md](data-and-privacy.md)); Phone testing on the sandbox's | both, bar the two ends |
| `/a/:agent/…` | an agent's six rows and their tabs, below | both |
| `/box/…` | the box's own screens | an operator, on production's |

**The sidebar is a tree.** The workspace and its org menu, ⌘K, then **Agents**: one row per agent
the gateway holds — its letter, its name, a dot, and *n live* while it is on calls, the one count
in the sidebar and the agent's own. The agent open is lifted, and its six rows hang under it:
**Overview · Chat · Calls · Test · Knowledge · Settings**; a click on the agent opens Overview. Under the agents, **Organization**: Home, Calls,
Evals, Numbers, Team, Usage, Settings; and **Box** for an operator. Nothing that is one agent's — its
callers, its judges, its simulations, its lexicon — is a row of the org's. A row with more than one screen gets
**the tab bar** over its screen (`shell/screen-tabs.tsx`); a row that is only a place for its tabs
(Test, Knowledge, the org's Settings) lands on the first one the key opens.

Both are filtered by the scopes the key holds (`packages/core/src/scopes.ts`): Chat, Dev chat and
Widget need `talk`; Agents, Calls and List `calls`; Personas, Judges, Simulations and both
Evals `evals`; Settings and Lexicon `words`; both Docs `knowledge`; Memory, Pipeline, Numbers,
Providers, Team and Usage the scope of their own name; the rest are open to any key. A screen a key
does not open is not drawn, so nobody meets a 403 on a click.

**The switcher** answers *what am I looking at*: the person, their org and the key's id, the two
environment chips, and one card per copy of an agent — yours, a teammate's, the one deployed on the
box. A colleague's copy opens from the sandbox's page and on a `team` key, never from the gateway's.

A call that starts while you are looking at something else pops a small window in the bottom-right
corner, with who is on and **Watch live** — three at a time at most, and never the call this tab
started itself or the one already open at `/calls/:call`. When a screen has nothing to show it says so **in a
sentence, never a spinner**, and a refusal is shown in the gateway's own words.

## Home

A window of whole UTC days, picked at the top — **24 h** (today), **7 d**, **30 d** — and kept in
the URL (`?days=7`). Four numbers across the top — conversations, resolved without a human, median
answer, spend — all counted by `GET /v1/insights?days=` over every call of the window, however many;
the first three carry the window of the same length before beside them, and spend carries the
month's budget instead, or the window's name when the org set none. A gateway that refuses the door
draws today alone, from the rows the page already holds, and no picker.

Under them, today whatever the window, **Needs a look**, a row per call a flag was raised on (`escalated`, `low score`, `promise
made`) with the judge's own reason; **On the floor now**, up to four live calls with **Listen**,
each opening the call itself; where calls arrived, by channel; and **Finish setting up**, the steps
still undone — a carrier and a number for a `numbers` key, the team for a `team` key, and a judge
for a `usage` key, because turning judging on is the org's spend.

## Agents

Home's second tab: which agents this gateway is holding right now: one row per slug with its channels, the numbers
routed to it, today's calls and the share of judges that held. Under them the **processes** — one
row per app socket, what each holds, and **Stop** for a key that may hold agents — then this
instance's **tokens in use** and **providers** ready or waiting for a key (numbers: production's).

## Calls, as a list

**Calls' second tab, List — one table, live or over.** Every call the org has taken, newest first
and **grouped by day**: the ones up right now under *On a call now*, then *Today*, *Yesterday*, and every day before under its
date, each with its count. A row leads with **who was on** — a name, a number, a web visitor — and
the last thing said under them, the way a thread reads; then the agent, the channel, how
the call ended as a pill (the caller's own hang-up quiet, a transfer amber, anything the platform did
red — or *live*), what the judges made of it, how long it ran and when. The id is the row's title
and the page it opens; pasted into the search box, Enter opens that call whether or not it is on the page.

**A call whose agent asked for a person** says so instead of saying *live* — an amber *wants a
person* pill — and comes first in the list, above every other live call: it is the one row somebody
reading this page has to act on. A window pops in the corner for it, wherever in the console you
are, with the reason and one click to the call; it closes itself when somebody takes the line.

**The filters are the URL**: `?q=`, `?agent=`, `?channel=` and `?status=` (`live` or `ended`), so
every list here is a link somebody can paste. The search asks the gateway (`q`, `agent`,
`channel`); a gateway that answers a `total` gets **Load more**. The search, the cut by day and who
a row names are core's (`calls-search.ts`, `calls.ts`) — the phone's Llamadas tab reads the same.
The rows are polled and re-read the moment the org's stream says something moved; an agent's own
List has no agent column and no agent to choose.

## One call

One page per call, at `/calls/:call`, whichever agent took it and whether or not it is over — the log is
read from its first entry and followed to its last, so a call that ends does not change pages, and
there is one URL to paste for a call rather than three. Its head carries the way back to
wherever it was opened from, then the call's id, its channel and direction, how it stands, who is on
it and how far the log got.

The middle is read four ways, switched in the head and kept by the browser for the next call
(`lib/preferences.ts`). **Chat**, first: bubbles, each tool one line. **Transcript**: the turns, the
tool calls with their arguments and output, confirmations, a supervisor's move, with no numbers.
**Log**: every entry in `seq` order, turns with their latencies and the blocks behind them, state
changes, a `memory.ops` or a `docs.sources` as one line, and the quiet stretches between. Under the
rows of those two, **the words being said right now**, each fading in as it arrives. **Trace**: each
exchange on an axis in seconds from the call's start — caller speaking, end of turn, LLM (first token
ticked), voice (first byte), tools, agent speaking — every bar placed by a measured instant (LiveKit
stamps a block when its work ends; its own length reaches back from there). A click on a bar puts
the block, tool or turn behind it at the top of the pane. Every view follows the call down and stops
the moment you scroll up to read.

On the right: the app's declared **state**, the **room** and its participants, the **prompt** block
by block — name, hash and length, never the text — and the **metrics**.

What happened to the **line itself** reads as a sentence among the turns, never a folded row: the
caller transferred (and to where, and whether it took), put on hold and taken off it, a person asked
for and whether one came, a call back written down.

**The desk** is drawn above them on a call that is not over, for a key that holds `supervise`, and
nowhere else — the role IS the scope, so a supervisor, a manager, a developer and an admin have it
and a `qa` key does not. It takes a hidden, silent seat in the room: listen, whisper, say, take the
line, hand it back, transfer, end. When the agent has **asked for a person**, the desk opens with
what it asked for and how long the caller has been waiting; taking the line is what answers it.
Whisper and Say are a box each, so nobody has to check which mode they are in before pressing Enter
— one of the two is heard by the customer. The two irreversible moves never leave on a single click.
A **typed** conversation — the widget's chat (a room whose caller holds a `chat` seat), WhatsApp —
has nothing to hear, asks for no microphone and is never transferred (the gateway refuses that
verb on a text call); the same five verbs are typed.

**When the call is over** the page freezes and says what it came to. The pane now opens with it:
the outcome, the **score** judge by judge — verdict, the sentence it answered with, the seqs it
cites as links into the log — the latency median and max per measure, with the silence before a
reply (`dead_air`) and the agent's share of the talking (`talk_share`) as the runtime folds them;
**where the time went**, every second of the call given to one part (before the first word, caller,
agent, both at once, waiting on the agent, on a tool, on the caller, with a person after a transfer
or a supervisor's take-over) so the parts add up to its length; the cost by model, and the seven facts of the call, above the four panes. At the foot of the log: the recording, one slim line
of play, time and a bar to drag, when the gateway holds the file; then one bar with **Details**,
folded, on its left and the call's moves on its right — **Re-check by code**, which replays the call,
**Promote to a golden**, a candidate in the agent's directory, **Erase this call** and **Do not call this number** ([data-and-privacy.md](data-and-privacy.md)). Details holds the consent
proof, the prompt block by block, and the whole log again with every row an anchor (`#seq-93`),
which is where a judge's citation lands. **Attach a judge** scores a call nobody judged.

## Calls, as conversations

**The Calls row itself, the org's and an agent's alike, and there is only one way a conversation is
drawn.** Down the left, **one thread per person** — a contact who reached two agents is one thread,
and the agent of its newest call is whose it is — each with the last thing said, when, and one
mark: *live* (amber when the agent **asked for a person**, and that thread sits at the top of the
list), *new* (a dot, no count, gone the moment the thread is opened), or a verdict that broke (`2/3`, red) — and
else, on the org's, whose agent. The one open is **the call, drawn exactly as *One call* draws it**:
the person's head over it, then the call in the view kept for it — chat, transcript or log — the desk on a live
call for a key that holds `supervise` (listen, whisper, say, take the line, transfer, end; typed on
a text call), and on one that is over its outcome, score, latencies, cost, recording and Details.
The URL names the call shown, so `/calls/:call` from anywhere lands here with the list beside it;
the person's other conversations are in the pane, each one click from being the call shown, and
**Open ↗** is the same call on a page of its own. Writing into a live call is the desk's Say; a
**closed WhatsApp thread** takes what you type through the gateway's own door, inside the channel's
window, as the agent. What the gateway keeps per contact — the name somebody wrote down, what is
unread, the call back — is one agent's, so it is drawn on the agent's own row; the org's names a
thread the way the list does, and the **+** that dials a number is the agent's too, because a call
is placed as one agent.

After the call's own panels, the pane carries the person, folded from the calls the screen already
listed and costing nothing: how they reached the agent, when they first
did and how long ago the last one was, how many conversations there have been, how long the agent
has spent on the line with them, how the judges answered over all of them, what a reviewer should
look at first (`escalated`, `low score`, `promise`), and every one of those conversations as a row
that opens it.

Over that sits **the agent's own panel**, when the class declares one — `@view` on the class, and
a function beside it written in `pinecall/panels` ([writing-an-agent.md](writing-an-agent.md#the-panel-beside-a-conversation-view)).
It is asked of the app holding the agent, one conversation at a time, so what it shows is the
tenant's own data — a customer's file, their orders, what they owe — read in the tenant's own
process with the tenant's own credentials. What reaches the browser is a tree of named nodes, not
code: the console draws it with its own parts, in the theme the reader chose. An agent that
declares no view is asked nothing at all, and the pane is the console's facts alone.

## Test: Personas

An agent's Test is four tabs: **Personas**, **Judges**, **Simulations** and **Evals**. A persona is
a caller a model plays against the agent: a goal, a manner, and the facts they may state about
themselves. A caller is ONE agent's — the patient who cancels is the clinic's — and the gateway
keeps them so, one list per agent in both worlds ([`pinecall personas`](the-cli.md#personas)):
the left side lists this agent's callers by name, and another agent of the org has its own, even
under the same name.

With none chosen, the middle is the agent's **standing**: its callers and how many have never been
called, its newest runs — caller, when, turns, verdict, each row opening that session — and the
callers nobody has put on it yet. Pick one and it is read as a short document — what they want, how
they talk, when they accept the call, how they are played, what they know — with **Use in a
simulation**, **Edit** and **Delete**, and beside it every call it made to this agent, newest first. The
editor writes the caller's rule in two halves — *they accept the call when*, *they decline it
when* — which the `persona` judge reads at hang-up, and the model, voice vendor and voice they are
played in, as an agent's settings spell them; a word this box does not have is refused on save.
The doors are `GET /v1/agents/{slug}/personas`, `PUT`·`DELETE /v1/agents/{slug}/personas/{name}`
and `GET /v1/agents/{slug}/personas/{name}/runs` (`evals`); Simulations offers the same list.

## Test: Judges

What every call of the agent is held to at hang-up: **the runtime's panel** — `consent`,
`grounded`, `promises`, and `persona` on a simulated call whose caller wrote a rule — each with
what it asks, who answers (code, or code then a model), when it runs, and its held-rate over the
agent's newest scored calls. Under it, two lists a tenant writes, each judge one sentence put to
the judge model the way `persona`'s rule is, on every call or only on a call a persona played:
**the org's**, asked of every agent's calls (never gives medical advice), and **the agent's own**,
about its job alone (offers the next free slot). Each is listed with its question and when it runs,
**Drop** forgets it, and **New judge** writes one — name, question, runs on — the same name again
replacing it; a panel's name, or a name the org and the agent would share, is refused. Its verdict
lands in `call.score` beside the panel's, under its name. The doors are `/v1/org/judges[/{name}]`
and `/v1/agents/{slug}/judges[/{name}]` (`evals`); the CLI's is [`pinecall judges`](the-cli.md#judges).

## Test: Simulations

The one place a caller is simulated from, on the agent it is under. The form is `pinecall
simulate`'s flags: the persona, the most turns the caller takes, a judge at hang-up (off), voice
(on here, off in the CLI, because the screen is for listening), and behind **Noisy line** the dB
under the caller and the packets lost (15 dB, 0%). It needs the `pinecall start` holding the agent,
in its directory, because the class is mounted there; anything else is the gateway's own refusal.

The call opens on the right as its own page draws it, with an ear on top: a spoken simulation is
**heard live, both sides**, the moment its room opens. The caller speaks the agent's language in the
persona's voice, else a Cartesia voice no agent is given, and waits for the agent's greeting.
**Stop** is the one move, and no desk is drawn: nobody is on this call to whisper to. Stopping hangs
up at once (`POST /v1/calls/{call}/verbs`) and the caller, played in the gateway off this call's
log, reads `call.ended`. The verb is a supervisor's, so a `qa` key is told so instead.

## Evals, Memory and Docs, org-wide

**Evals**, a row of the sidebar, is every agent's: the suites run on purpose beside the real calls judged
at hang-up — how many were judged, how many held, which agents' newest suite is green, and the forty
calls that did not hold with the judge's reason. **Memory** and **Docs** are Settings' tabs: every
current fact any agent's calls taught, newest first, searchable, droppable one row at a time; and
every base of documents pushed in this world, its chunks, its embedder and which agents search it; a base opens onto its files, read,
written, added and taken out one at a time, and **New base** starts one here from a name and its
first documents, with no project to push from.

## Lexicon

An agent's words — a tab of its Settings, at `/a/:agent/lexicon` — in two tabs because they are two
different fixes:
**Pronunciation** is how the voice says a word it says wrong, **Recognition** is the words the ears
must know. Each console sets its own world's; the sandbox's has a *Your copy · The team's* switch
over it, and switching with a word half written warns before it is discarded. A `words` key — a
supervisor's, a manager's — opens it, so a brand said wrong forty times a day is fixed without a
developer and without a deploy. The org's `/lexicon` of before lands on Home: it names no agent.

## Numbers, Tokens, Providers, Team, Usage

**Numbers** is three tabs — the numbers and which agent each rings, the outbound calls your agents
place, and the carrier. **This screen is where a door comes from**: a class declares none, so a
number reaching one agent is a row here (or `pinecall numbers import`), moved by adding it again,
nothing deployed; the web needs no row. Adding a number and turning outbound on are **planned
first** — the gateway's steps, in its words, then the button. **Tokens**, open to every key: your
keys at this instance and the org's server tokens, shown once as `PINECALL_KEY=…`, made in this
console's world (`POST /v1/keys` refuses the other). **Providers**: the vendors this build runs and
the keys the org brought here. **Team**: people, roles and single sign-on. **Usage**: what the org
consumed, by day, by agent and call by call; it and Home show **Minutes used · n of N** where minutes
are limited, *Upgrade* only where the box bills (`lib/limits.tsx`). The sandbox's console has
**Phone testing** instead: which number reaches your copy, and how to tell which phone is yours.

**Notifications** is reached from every screen by the **bell in the top bar**, which reads *Turn on
notifications* while this browser is not told (`shell/notices-button.tsx`): a supervisor who misses
a call waiting on a person misses the one thing this is for. It is a person's own, open to every key
— whether *this browser* is told (Web Push, `public/sw.js`), what they are told about in this org
**and this world** (production's console chooses for production's calls: a call asking for a
person on by default, every incoming call off; the sandbox's for the sandbox's, both off until
turned on), and their devices — and it is not the gateway's: the doors are Pinecall's notifier
(`notify.pinecall.io`; `VITE_PINECALL_NOTIFY` names another), through `core/src/notify.ts`, and
the world is the one the page names. A notice clicked opens `/calls/:call?org=` at its own world's
name (the worker asks this name's `/.well-known/pinecall` for the other), in its org first
(`lib/from-a-notice.tsx`). *Send a test* sends one notice to every device of the person and prints
what came of each. **Data & privacy**, the org's rules, consent, export, erasure and who read what,
is its own page: [data-and-privacy.md](data-and-privacy.md).

## An agent's screens

Six rows, and their tabs: **Overview**, below; **Chat** (and **Dev chat**, the sandbox's); **Calls** — the org's
conversations with the agent fixed — and **List**, its table; **Test** (above); **Knowledge** — **Docs** and **Memory**; **Settings**, with
**Pipeline**, **Lexicon** (above) and **Widget**.

### Overview

The agent over the same window as Home's picker (24 h, 7 d, 30 d, in the URL); unpicked, the
shortest that holds a call, else 30 d. Counted by the gateway (`GET /v1/insights?agent=&days=`) over
every call of it, however many: calls and how many are live, the share whose judges all held, the
mean length, what they cost, how often a person took part; **calls a day** by channel and **spend a
day**, a bar for each day of the window, a hover giving the day's numbers; how calls end, where they
come in, the pipeline's median latencies; and the newest calls a reviewer should open first, off its
newest calls (`/v1/sessions?agent=`). Nothing is estimated: a day with no calls is a zero bar, a
measure nobody took is a dash, a door the key does not open says so. What the door answers is read
for the charts in `overview/counted.ts`.

### Chat

**A chat window, as a chat opens**: with nothing said, a question and the box in the middle; then
the conversation, the box at its foot. Writing starts a **text** chat (the same room, no audio) and
sends the line once the agent has opened the call; the round button calls by **voice** (the
microphone over WebRTC), and turns into the arrow once something is typed. On a voice call the box
types into it, between the microphone and hang up. The agent's replies are text, each tool it ran a
card — arguments, ✓ or ✗, how long, the result folded — and under each reply copy, 👍 and 👎: the 👎
asks what was wrong and what it should have said, the record a correction will be kept as; its Save
waits for a door the gateway does not have yet. Beside it, the **Inspector**.

### Dev chat

Local only, for the breakpoint: the class is mounted in your terminal, so a `@tool` body runs against
your database and you can stop inside it. A call starts from *As* (a number, a customer id, or nobody)
and *From* — the opening, or a golden's state; a terminal holding **another** agent's directory is named.

### Settings

What the agent runs on, per world and per corner, **a version a row**. The form is **one tab a
section** — STT, LLM, Voice, Conversation, Memory, Knowledge, Bases — and every vendor, model and
model in it is a dropdown of what this box can actually run, read off the pipeline report. Knowledge
is what the agent knows by heart, in Markdown, read whole on every call; Bases is what it searches.
Every section is saved together, as one version, over the version it was read at: a corner that
moved since is told so and never written over.

**Voice** is picked by ear. For a vendor whose catalogue row says so (`voices_listed` in
`GET /v1/providers`: Cartesia's read from Cartesia, ElevenLabs' the names the runtime curates) the
voices are the vendor's own list in the agent's language (`GET /v1/voices`, the wire's
`VoicesListed`), narrowed by country — Spain and Mexico are both `es` — by gender where the voices
carry one, and by a word. Each has a play button that says the agent's own opening with the model
picked above (`POST /v1/voices/sample`, the wire's `VoiceSample`); an agent with no opening
sends no line at all, and the gateway reads one in the agent's language. Beside it is the wait from
the words to the first audio over the vendor's stream; a call keeps that connection warm, so its
own wait sits a little under. A sample is asked once per vendor, model, line and voice and kept
while those stand. What the gateway refuses — a typo, a model it would swap, a line over its
ceiling, too many samples a minute, no key for the vendor — is shown in its own words. **Use** puts
the voice in the form; nothing changes until the form is saved. Any other vendor speaks in its own
id, set from the terminal with `pinecall agent set --voice`.

**Recording**, in Conversation, is three choices and not two: *keep the audio*, *keep none*, and
*not set* — because a corner that never said is not a corner that said no. Not set falls through
to the corner below, and an agent nobody has told keeps its audio. What is kept is the whole room,
which is what the conversation's page plays back: the caller, the agent, the hold music and a
supervisor who took the line. **Longest voice call** beside it: the runtime's ten minutes, 5 to 60,
or *no limit* — a minute before it the agent wraps up, at it the call ends as a timeout; never a chat.

**Bases** is a row per attachment, and the row is the whole attachment: the base, how many chunks
a turn reads, who searches it (the platform before every turn, or the model when it decides) and
the least fused score kept. Several rows are ONE search — read together and ranked against each
other — so the turn is handed the most generous of their chunk counts and each floor is read
against the base that set it; a collection with nothing to say about the question takes none of
the turn's chunks. Only a base pushed in this world is offered.

Beside the form a pane that stays: **What is set now**, a corner at a time — yours, the team's and
production's in the sandbox, production alone on the gateway's page — and the **History**, every
version with who set it and why, and **Roll back**, which brings one back as the next version. A
`words` key sees the opening, what is remembered and Knowledge, and nothing else.

### Pipeline

The three legs of a voice turn as data, with this agent's settings already applied, so the screen
cannot show a pipeline the next call will not run: hears, decides and speaks, each with its vendor
and model; the **anatomy of a turn** as medians over the last calls; and the **hold melody**, what
the caller hears while a tool runs. Nothing else here writes — changing any of it is Settings, and
a card says so.

### Docs, Memory, Evals, Widget

**Docs** pushes the directory's `docs/<name>/` folder whole and runs its golden, lists every base of
the world, and shows which bases this agent reads, off its settings. **Memory** is every current
fact this agent's calls taught, one droppable at a time, plus the recall golden and the extraction
cases. **Evals** is the calls the judges sealed and the drift of each judge's held-rate over two
windows in both consoles, and — on the sandbox's only, because running a suite needs the class
on this disk — the goldens as questions with the latest run's verdict on each, **Run all**, the runs
table and one run's matrix judgment by judgment. **Widget** is the script tag to paste, with the
title, tagline, greeting, accent, theme (auto, light or dark) and autostart the gateway keeps per agent and world, the company
and the phone read off the org's numbers, and the widget mounted as a live preview; a phone agent is called **by code** (`code-url`
in the snippet, `POST /v1/codes` as whoever looks in the preview: the number, four digits, and the
call that keys them). What the tag takes is the **widget** repo's `README.md`.

Docs, Memory and Evals each ask the `pinecall start` standing in the agent's directory for the half
that lives on that disk; when no process is there, the card says so and the rest of the screen still
loads.

## The box's screens

A person the box made an operator gets six more, under **Box**: every organization and one of them
whole, the fleet of workers and its cordon, the routes a number takes, a number's **Traceback** (its
phone calls in every org, kept or erased with the record the erasure left, and every dial to it,
placed or refused: `GET /v1/ops/traceback`, what a carrier asks for), what every org consumed, and
what the gateway itself is set to — sign-in, mail and brand. They are drawn only once `GET /v1/ops/whoami`
has answered that this person runs the box, and every door under them is the operator's own
(the runtime's `docs/protocol/operator-api.md`).

## The way in

**Production is where a person signs in**: email and password, the workspaces it opens, **Continue
with Google** where the operator wired a client, **Continue with SSO** where the gateway has the
discovery door; an invitation or a reset is a one-use link to a card that sets a password. A
person's **one** key per origin rides a header, never a URL; signing out forgets it. A person their
org keeps out of production (whoami's `production: false`) meets *No production access* there, with
a button that opens the sandbox on the same key.

`pinecall console` skips the card: it mints the code for the key in the project's `.env`, and the
page spends it for a key of that browser's own — the project's key never reaches the browser.
`pinecall login` (and `pinecall link`) send a terminal here: `/cli?c=<word>` asks *Sign this
terminal in?* and mints the terminal's own key, which never travels through the page.
When the box bills (`billing_url` of `GET /v1/limits`), `/billing[?plan=]` hands the signed-in
person to that page with a one-use login code, in the org they are working in; the billing page
sends anyone who reaches it without a session here, and *Upgrade* under the minutes opens it the
same way. Nobody types a password or an org on the billing page.

## What it keeps true

- **The URL is the state.** A reload lands on the same thing, and `?q=`, `?agent=`, `?channel=`,
  `?status=`, `?section=`, `?view=`, `?run=` and `#seq-` are links people paste.
- **The console holds no truth of its own**: the wire's shapes and the log's reducer are the
  runtime's, kept in `packages/core/src/wire/` and held to its golden log.
- **A door that is not there is an element not drawn**, never an error on screen; a refusal is the
  gateway's own sentence.
- **Nothing is invented.** A value nobody measured is `—`, not a zero; a judge that did not answer
  is not a pass; a number the gateway does not count is folded from the rows the page holds, and the
  page says nothing it cannot.
