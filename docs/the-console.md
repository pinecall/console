# The console

The console is one bundle the runtime's gateway serves at its one name, with **both worlds** in it.
**Production** is what customers reach. **The sandbox** is where things are tried: your copies of the
agents, your calls, your corner of the settings. One gateway, one database and one sign-in hold both;
what keeps a test call off a production process is the worker fleet each world has.

**The world is the path**: `https://<name>/…` is production's console and `https://<name>/sandbox/…`
the sandbox's, the same screens under the `/sandbox` prefix. `lib/mode.ts` reads the first segment
when the page loads, and every request names that world in `pinecall-env`; the doors stay at the
root (`/v1/…`) whichever world the page is. The sidebar's **Production · Sandbox** control opens the
same screen in the other world — `/sandbox` put on or taken off, same origin, same key, no second
sign-in — so no screen ever holds one world's data under the other's path. Which screens each console has is a table in that file —
the org's, the box's, an agent's — which the sidebar and the tab bar draw and the router routes, so
a screen a console lacks is neither linked nor reachable by its path.

| URL | screen | where |
|---|---|---|
| `/` | **Overview**: who is on the line, the window's numbers, calls a day, what needs a look, the agents | both |
| `/calls[/:call]` | **Calls**: every conversation, as threads beside the call open — where a live call is supervised — or as one table (`?view=table` `?status=` `?focus=1` `?q=` `?agent=` `?channel=`) | both |
| `/quality` | **Quality**: how the real calls are judged at hang-up — the share that held, what broke, every judge | both |
| `/agents` | **Agents**: every agent held, its processes, the tokens in use and the providers | both |
| `/numbers` · `/team` · `/usage` | the workspace: the org's numbers, people and bill | production's |
| `/settings` → `/tokens` · `/providers` · `/apps` · `/secrets` · `/docs[/:base]` · `/memory` · `/notifications` · `/data` · `/phone` | **Settings**' tabs: this instance's tokens and vendor keys, the apps the box hosts and their secrets ([hosted-apps.md](hosted-apps.md)), every base and every fact, what you are told, the org's data ([data-and-privacy.md](data-and-privacy.md)); Phone testing on the sandbox's | both, bar the two ends |
| `/a/:agent/…` | one agent in view: the same Overview, Calls and Quality, and what builds it, below | both |
| `/box/…` | the box's own screens | an operator, on production's |

The URLs of before still land: `/overview` is Agents, `/list` Calls' table, `/evals` Quality, and an
agent's `inbox`, `talk`, `settings`, `evals` and `judges` are its Calls, Playground, Configure,
Goldens and Quality (`router.tsx`).

**One word, one place.** The sidebar never says a word twice. At its top the org (and its menu, for
a person of several), **Production · Sandbox**, and **Viewing**: whose calls are on screen — *All
agents*, or one (`shell/viewing.tsx`). The agent is what you look at, never a section of its own:
**Overview · Calls · Quality** are the same three rows whoever is in view — `/calls` is every
agent's, `/a/:agent/calls` the same screen with one — and changing who is in view keeps the screen
you are on. With every agent in view, **Agents** lists them; with one, **Build** adds what makes it:
**Playground · Test · Knowledge · Configure**. At the foot, always the org's, the **Workspace**:
Numbers, Team, Usage, Settings; and **Box** for an operator. ⌘K and *n live* on Calls — amber while a
caller waits for a person — are the rest. A row with more than one screen gets **the tab bar** over
its screen (`shell/screen-tabs.tsx`); a row that is only a place for its tabs (Test, Knowledge,
Settings) lands on the first one the key opens.

Both are filtered by the scopes the key holds (`packages/core/src/scopes.ts`): Playground, Dev chat
and Widget need `talk`; Agents, Calls and an agent's Overview `calls`; Quality, Goldens, Personas
and Simulations `evals`; Configure and Lexicon `words`; both Docs `knowledge`; Memory, Pipeline,
Numbers, Providers, Team and Usage the scope of their own name; the rest are open to any key. A
screen a key does not open is not drawn, so nobody meets a 403 on a click.

**Viewing** answers *whose calls am I looking at*: All agents, and one row per copy of an agent —
the one deployed in production; yours, a teammate's or the team's in the sandbox — with *n live*
beside it. A colleague's copy opens from the sandbox's page and on a `team` key, never from the
gateway's. The top bar says the rest in a line: who is in view, then the screen.

A call that starts while you are looking at something else pops a small window in the bottom-right
corner, with who is on and **Watch live** — three at a time at most, and never the call this tab
started itself or the one already open at `/calls/:call`. When a screen has nothing to show it says so **in a
sentence, never a spinner**, and a refusal is shown in the gateway's own words.

## Overview

**One screen, whoever is in view.** With every agent in view it opens on the greeting and the
org's day; with one, on that agent's name — the same numbers, only its calls. A window of whole UTC
days is picked at the top — **24 h**, **7 d**, **30 d** — and kept in the URL (`?days=7`);
unpicked, it is the shortest that holds a call, read off the last 30 days.

**On the line now** first: a card per live call — who, the agent, the door and how long — the
one waiting for a person lifted and first, with **Take the line**; every other with **Listen**,
each opening the call. Then the window's numbers in one strip, counted by `GET /v1/insights?days=`
(with `agent=` when one is in view) over every call of the window, however many: calls, resolved
without a person, held by the judges, the median answer and spend — the first two and the median
against the window of the same length before, spend against the month's budget — and **Minutes
used · n of N** where minutes are limited.

Beside **calls a day** by channel (a bar a day, a hover giving its numbers), **Needs a look**:
every agent whose newest suite has goldens failing, and the newest calls a person took part in,
a judge broke, or that promised what no tool recorded — each one click from where it is fixed.
Under them how calls end, and either where calls come in (every agent) or how fast the agent
answers, its pipeline's medians (one agent). With every agent in view, **Finish setting up**
lists what is still undone — a carrier and a number for a `numbers` key, the team for a `team`
key, judging for a `usage` key — and the **agents** close the page: on the line, calls, how their
judges held and their newest suite, a row putting that agent in view. Nothing is estimated: a day
with no calls is a zero bar, a measure nobody took is a dash.

## Agents

A row of its own with every agent in view: which agents this gateway is holding right now, one row per slug with its channels, the numbers
routed to it, today's calls and the share of judges that held. Under them the **processes** — one
row per app socket, what each holds, and **Stop** for a key that may hold agents — then this
instance's **tokens in use** and **providers** ready or waiting for a key (numbers: production's).

## Calls

**The one place calls are read.** Over the screen a bar: the status chips — **All · Live · Wants a
person · Did not hold**, each with its count, the URL's `?status=` — and **Threads · Table**
(`?view=table`). Both read the list the sidebar's live count is folded from, so the two never
disagree.

### As a table

**One table, live or over.** Every call the org has taken, newest first
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

**The filters are the URL**: `?q=`, `?agent=`, `?channel=` and the status chip picked, so every
list here is a link somebody can paste. The search asks the gateway (`q`, `agent`,
`channel`); a gateway that answers a `total` gets **Load more**. The search, the cut by day and who
a row names are core's (`calls-search.ts`, `calls.ts`) — the phone's Llamadas tab reads the same.
The rows are polled and re-read the moment the org's stream says something moved; with one agent in
view the table has no agent column and no agent to choose, and a row opens the call beside its thread.

## One call

One URL per call, `/calls/:call` (or `/a/:agent/calls/:call` with that agent in view), whichever
agent took it and whether or not it is over — the log is read from its first entry and followed to
its last, so a call that ends does not change pages. **The head is the person**: who is on the
call and how it stands — *on a call* and its clock, *wants a person*, or how it ended — then where
they came from, the door and the agent; the call's id is the name's title, and the stream is
mentioned only while it is not following the log. On its right, how the call is read and the
screen's moves: **Focus**, which folds the conversations away and gives the call the screen
(`?focus=1`), and **Call back** to a phone number.

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

### As threads

**Calls' first view, every agent's and one agent's alike, and there is only one way a conversation
is drawn.** Down the left, **one thread per person** — a contact who reached two agents is one thread,
and the agent of its newest call is whose it is — each with the last thing said, when, and one
mark: *live* (amber when the agent **asked for a person**, and that thread sits at the top of the
list), *new* (a dot, no count, gone the moment the thread is opened), or a verdict that broke (`2/3`, red) — and
else, on the org's, whose agent. The one open is **the call, drawn exactly as *One call* draws it**:
the call in the view kept for it — chat, transcript or log — the desk on a live
call for a key that holds `supervise` (listen, whisper, say, take the line, transfer, end; typed on
a text call), and on one that is over its outcome, score, latencies, cost, recording and Details.
The URL names the call shown, so `/calls/:call` from anywhere lands here with the list beside it;
the person's other conversations are in the pane, each one click from being the call shown, and
**Focus** is the same call alone on the screen. Writing into a live call is the desk's Say; a
**closed WhatsApp thread** takes what you type through the gateway's own door, inside the channel's
window, as the agent. What the gateway keeps per contact — the name somebody wrote down, what is
unread, the call back — is one agent's, so it is drawn with that agent in view; every agent's names a
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

An agent's Test is what comes before a change ships, three tabs: **Goldens** (below), **Personas**
and **Simulations**. How its real calls are judged is Quality's. A persona is
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

## Quality

**How the real calls are going**, judged at hang-up — every agent's, or the one in view's;
whether a change is safe before it ships is Test's. The week's numbers across — calls judged, held,
did not hold (one click to Calls with *Did not hold* picked) — then **held, a day at a time**: the
share of judged calls where every judge held, one line over the last 30 days, a day nobody judged
a gap and never a zero (`GET /v1/insights`'s `series`). Beside it **what broke**: the calls the
page follows whose judges said no, each with the judge's own reason, opening the call. With every
agent in view, the agents by how their judges held.

**Judges**, one table: **the runtime's panel** — `consent`, `grounded`, `promises`, and `persona`
on a simulated call whose caller wrote a rule — each with what it asks, who answers (code, or code
then a model) and when it runs; **the org's**, asked of every agent's calls (never gives medical
advice), written here with every agent in view; and with one in view, **the agent's own**, about
its job alone (offers the next free slot), written there. Each judge's held-rate is over the newest
judged calls the page read; where the `pinecall start` holding the agent answers, the table counts
`pinecall runs drift`'s windows instead — the last 7 days against the last 30, and the points
between, a fall past the threshold in red. **New judge** writes one — name, question, runs on — the
same name again replacing it; **Drop** forgets it; a panel's name, or a name the org and the agent
would share, is refused. Its verdict lands in `call.score` beside the panel's, under its name. The
doors are `/v1/org/judges[/{name}]` and `/v1/agents/{slug}/judges[/{name}]` (`evals`); the CLI's is
[`pinecall judges`](the-cli.md#judges).

## Memory and Docs, org-wide

**Memory** and **Docs** are Settings' tabs: every
current fact any agent's calls taught, newest first, searchable, droppable one row at a time; and
every base of documents pushed in this world, its chunks, its embedder and which agents search it; a base opens onto its files, read,
written, added and taken out one at a time, and **New base** starts one here from a name and its
first documents, with no project to push from.

## Lexicon

An agent's words — a tab of its Configure, at `/a/:agent/lexicon` — in two tabs because they are two
different fixes:
**Pronunciation** is how the voice says a word it says wrong, **Recognition** is the words the ears
must know. Each console sets its own world's; the sandbox's has a *Your copy · The team's* switch
over it, and switching with a word half written warns before it is discarded. A `words` key — a
supervisor's, a manager's — opens it, so a brand said wrong forty times a day is fixed without a
developer and without a deploy. The org's `/lexicon` of before lands on Overview: it names no agent.

## Numbers, Tokens, Providers, Team, Usage

**Numbers** lists each number with **what a call to it does now** — *Rings the agent*, *Not reaching
us yet*, *Not answered* (`GET /v1/numbers`'s `rings`) — where it comes through, and who wrote its
row, *added by the box operator* among them. A row opens to its **path** (`GET
/v1/numbers/{number}/path`): carrier, fence, world, agent, each with what would fix it, the last
call, and Move and Remove. **Add a number** is a page of its own (`?add=`) that asks one question first, where the
number lives, and offers only what the box allows (`GET /v1/carriers/catalog`): **automatic**
(buying, Twilio, WhatsApp: the account connected on that page, the gateway's steps shown before
anything is written), **guided** (a carrier the operator admits: the address to paste in its portal,
then *waiting for the first call* until one reaches the box), **reviewed** (an own PBX: the console
mints its password and shows it once, and the number waits for the operator to approve its
addresses). **Accounts** shows what each account can do, a peer's addresses with the operator's
answer to each — the same accounts `pinecall carriers` adds, lists and drops from a terminal; **Calling out** is turned on with a plan first. **This screen is where a door comes
from**: a class declares none, so a number reaching one agent is a row here (or `pinecall numbers
import`), moved by adding it again, nothing deployed; the web needs no row. **Tokens**, open to
every key: your keys at this instance and the org's server tokens, shown once as `PINECALL_KEY=…`,
made in this console's world (`POST /v1/keys` refuses the other). **Providers**: the vendors this
build runs and the keys the org brought here. **Team**: people, roles and single sign-on. **Usage**:
what the org consumed, by day, by agent and call by call; it and Overview show **Minutes used · n of N**
where minutes are limited, *Upgrade* only where the box bills (`lib/limits.tsx`). The sandbox's
console has **Phone testing** instead: which number reaches your copy, and how to tell which phone
is yours.

**Notifications** is reached from every screen by the **bell in the top bar**, which reads *Turn on
notifications* while this browser is not told (`shell/notices-button.tsx`): a supervisor who misses
a call waiting on a person misses the one thing this is for. It is a person's own, open to every key
— whether *this browser* is told (Web Push, `public/sw.js`), what they are told about in this org
**and this world** (production's console chooses for production's calls: a call asking for a
person on by default, every incoming call off; the sandbox's for the sandbox's, both off until
turned on), and their devices — and it is not the gateway's: the doors are Pinecall's notifier
(`notify.pinecall.io`; `VITE_PINECALL_NOTIFY` names another), through `core/src/notify.ts`, and
the world is the one the page names. A notice clicked opens `/calls/:call?org=` in its own world —
the sandbox's under `/sandbox` — in a tab of this origin if one is open, in its org first
(`lib/from-a-notice.tsx`). *Send a test* sends one notice to every device of the person and prints
what came of each. *Remove*, beside each device, forgets it — a phone lost, a browser no longer
used (`DELETE /devices/{id}`, the person's own devices only); on this browser's own row it is *Turn
off*, so the subscription goes with it. **Data & privacy**, the org's rules, consent, export, erasure and who read what,
is its own page: [data-and-privacy.md](data-and-privacy.md).

## An agent's screens

With one agent in view, the three rows looked at are the org's own — Overview, Calls, Quality,
above, with only its calls — and **Build** is what makes it: **Playground** (and **Dev chat**, the
sandbox's); **Test** — **Goldens**, **Personas**, **Simulations** (above); **Knowledge** — **Docs**
and **Memory**; **Configure** — **General**, **Pipeline**, **Lexicon** (above) and **Widget**.

### Playground

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

### Configure

Its first tab, **General**, is what the agent runs on, per world and per corner, **a version a row**. The form is **one tab a
section** — STT, LLM, Voice, Conversation, Memory, Knowledge, Bases — and every vendor, model and
model in it is a dropdown of what this box can actually run, read off the pipeline report. Knowledge
is what the agent knows by heart, in Markdown, read whole on every call; Bases is what it searches.
Every section is saved together, as one version, over the version it was read at: a corner that
moved since is told so and never written over.

**Voice** is picked by ear. For a vendor whose catalogue row says so (`voices_listed` in
`GET /v1/providers`: the ones whose plugin lists its voices, and the ones the box's providers row
lists, Cartesia's among them) the voices are that list in the agent's language (`GET /v1/voices`, the wire's
`VoicesListed`), narrowed by country — Spain and Mexico are both `es` — by gender where the voices
carry one, and by a word. Each has a play button that says the agent's own opening with the model
picked above (`POST /v1/voices/sample`, the wire's `VoiceSample`); an agent with no opening
sends no line at all, and the gateway reads one in the agent's language. Beside it is the wait from
the words to the first audio over the vendor's stream; a call keeps that connection warm, so its
own wait sits a little under. A sample is asked once per vendor, model, line and voice and kept
while those stand. What the gateway refuses — a typo, a model it would swap, a line over its
ceiling, too many samples a minute, no key for the vendor — is shown in its own words. **Use** puts
the voice in the form; nothing changes until the form is saved.

**A voice by its id** is the field under the list, and the whole of it for a vendor that lists
none — most of them: the org's own voice, a clone, one no list carries. **Listen** asks the same
sample door with that id, so a vendor with no such voice refuses it there, in its own words, rather
than on the next call; **Use** takes the id only once the vendor has said a line with it.

**Recording**, in Conversation, is three choices and not two: *keep the audio*, *keep none*, and
*not set* — because a corner that never said is not a corner that said no. Not set falls through
to the corner below, and an agent nobody has told keeps its audio. What is kept is the whole room,
which is what the conversation's page plays back: the caller, the agent, the hold music and a
supervisor who took the line. **Longest voice call** beside it: the runtime's ten minutes, 5 to 60,
or *no limit* — a minute before it the agent wraps up, at it the call ends as a timeout; never a chat.
**Language**, under STT's vendor and model, is a tag (`en`, `es`, `pt`, `fr`, `de`, `it`, or one set
from the terminal such as `pt-BR`, kept as set) or *not set*, which pins none: each vendor runs its own default.

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

### Goldens, Docs, Memory, Widget

**Goldens**, Test's first tab, is the goldens as questions with the newest run's verdict on each,
the runs table and one run's matrix judgment by judgment; **Run all** and the suite form are the
sandbox's, because running a suite needs the class on this disk, and production's Goldens offers
the same screen there instead. **Docs** pushes the directory's `docs/<name>/` folder whole and runs
its golden, lists every base of the world, and shows which bases this agent reads, off its
settings. **Memory** is every current fact this agent's calls taught, one droppable at a time, plus
the recall golden and the extraction cases. **Widget** is the script tag to paste, with the
title, tagline, greeting, accent, theme (auto, light or dark) and autostart the gateway keeps per agent and world, the company
and the phone read off the org's numbers, and the widget mounted as a live preview; a phone agent is called **by code** (`code-url`
in the snippet, `POST /v1/codes` as whoever looks in the preview: the number, four digits, and the
call that keys them). What the tag takes is the **widget** repo's `README.md`.

Goldens, Docs, Memory and Quality's drift each ask the `pinecall start` standing in the agent's directory for the half
that lives on that disk; when no process is there, the card says so and the rest of the screen still
loads.

## The box's screens

A person the box made an operator gets seven more, under **Box**: every organization and one of
them whole, the fleet of workers and its cordon, **Carriers** (the carriers of the box's catalog
with a switch each, Twilio always on; the addresses orgs asked for, approved or refused; and the
fence as nftables holds it: `GET /v1/ops/carriers`, `/v1/ops/carrier-networks`), **Routes** (every number of every org and world in one
table — whose it is, how it came, and what a call to it does now: picked up, nobody runs the agent,
or another org's older row takes it; read-only, since a number is added, moved or let go from its
org's Numbers screen; `GET /v1/ops/numbers`, and a row opens the number's Traceback), a number's
**Traceback** (its phone calls in every org, kept or erased with the record the erasure left, and
every dial to it, placed or refused: `GET /v1/ops/traceback`, what a carrier asks for), what every
org consumed, and what the gateway itself is set to — sign-in, mail and brand. They are drawn only
once `GET /v1/ops/whoami` has answered that this person runs the box, and every door under them is
the operator's own (the runtime's `docs/protocol/operator-api.md`).

## The way in

**Production is where a person signs in**: email and password, the workspaces it opens, **Continue
with Google** where the operator wired a client, **Continue with SSO** where the gateway has the
discovery door; an invitation or a reset is a one-use link to a card that sets a password. A
person's **one** key, for both worlds, rides a header, never a URL; signing out forgets it. A person
their org keeps out of production (whoami's `production: false`) meets *No production access* at the
root, with a button that opens the sandbox — `/sandbox/` — on the same key.

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
