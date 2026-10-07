# pinecall/console

The web console for the Pinecall runtime.

The runtime's gateway serves the console at its name, with both worlds in it: production and the
sandbox, a switch at the top, one sign-in.

- **Production** manages the org: deployed agents, calls, phone numbers, API tokens, vendor keys,
  team and usage.
- **Sandbox** is for development: your copies of the agents, live calls, Dev chat, test suites,
  phone testing.

`pinecall console` (the CLI, [pinecall/cli](https://github.com/pinecall/cli))
opens it signed in.

## Development

```bash
pnpm install
pnpm check      # build, lint and test every package
```

| package | |
|---|---|
| `apps/console` | the web console |
| `packages/core` | what the page stands on: the gateway client, the key, the call's state, the palette |

Nothing is published to npm. The runtime's `scripts/console` copies `apps/console/dist/` into the
gateway, and the runtime's `make deploy` ships it. To see the page, run a gateway (see the
runtime's README) or `pnpm --filter @pinecall/console dev`, which proxies to production.

The repositories are expected side by side:

```
pinecall-v2/
├── console/     this repository
├── runtime/     the gateway that serves the console and the API it reads
└── agents/      the agent framework and CLI
```

Every screen, and which world has it: [docs/the-console.md](docs/the-console.md).
