# Apps and Secrets

Two tabs of Settings, in both worlds: the agents **the box runs for the org** — a hosted app, uploaded
from a terminal with `pinecall deploy` — and the values those apps are started with. Every door
here acts in the world the console is in, like every other tab of Settings: an app hosted in
production is not hosted in the sandbox, and a secret set in one is not set in the other. The doors
are the runtime's (`docs/protocol/hosting.md`); the terminal's twins are `pinecall deploy` and
`pinecall secrets` ([the CLI](https://docs.pinecall.io/cli/overview)).

**Which key opens them**: every door takes `app`, which a person's key holds where their role is a
developer's or an admin's. The tabs are drawn for every key; a key without `app` is shown the
gateway's refusal in its own words, as every tab shows one.

## Apps

`/apps` (`screens/apps`) lists `GET /v1/hosted`, one row per app: its name, its **state**, who made
it, and the **hours it served this month** — `GET /v1/hosted/usage` with no month is this UTC
month, and the column is the sum of the app's days, in hours with one decimal. The state is one
pill, read off the newest release (`screens/apps/fold.ts`):

| state | when |
|---|---|
| **stopped** | a person stopped it: nothing runs, its releases and token stay |
| **live · release N** | the newest release is the one serving |
| **release N on its way** | the newest is not serving yet; the one before, if any, answers meanwhile |
| **release N failed** | the newest did not build or start: the row shows the first line of why, and opens to all of it |
| **no release yet** | the app exists and nothing was uploaded to it |

An org with no app is told how one gets here: `pinecall deploy` in the project's folder, `--prod`
for production.

Each row's actions:

- **Logs** opens a panel under the list with the app's last lines (`GET /v1/hosted/{name}/logs`),
  when the box read them and which process (`host`) they are of. **Asking is what makes the box
  send them**: the runner sends fresh lines with its next beat, some 5 s after a person asked, so
  the panel asks again every 3 s while it is open and not once after it closes. Before the runner
  has sent any, the panel says it is asking.
- **Releases** opens the app's releases, newest first (`GET /v1/hosted/{name}/releases`): the
  number, the note, who sent it, when, its size (its sha256 on hover). Every release but the one
  serving has **Roll back to this**, which asks first — release N's sources become the next
  release, and the one serving keeps answering until the new one registers — then
  `POST /v1/hosted/{name}/rollback {release}`. A release is never edited: a rollback is a new one.
- **Stop** (`POST …/stop`) asks first: the process drains, and the releases and the token stay.
  A stopped app has **Start** instead (`POST …/start`), which runs its newest release again.
- **Remove** (`DELETE /v1/hosted/{name}`) asks first: every release goes and the app's token is
  revoked. There is no undo.

## Secrets

`/secrets` (`screens/secrets`) lists `GET /v1/secrets`: a name, who set it and when — **never a
value**, because no door answers one. A secret is set or replaced by name and value
(`PUT /v1/secrets/{NAME} {value}`); the value is a password field, sent once and cleared from the
form when it is kept, so a value that was lost is set again. **Delete** asks first
(`DELETE /v1/secrets/{NAME}`). Both answer the list, which the tab shows.

The page refuses a name before the gateway does, by the gateway's rule (`screens/secrets/name.ts`):
an environment variable's — capitals, digits and underscores, starting with a capital — and never
one starting with `PINECALL_`, which the box sets itself; a value may not be empty. Whatever else
the gateway refuses (a value over 16 KB, say) is shown in its words.

**Setting or removing a secret restarts every hosted app of the org in that world**: the box starts
each one again with the new environment, and the old process answers until the new one registers.
