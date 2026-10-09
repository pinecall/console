/** Personas with every agent in view: every caller the org has written, each with whose it is, a row opening it under its agent. */

import { useEffect, useState, type ReactNode } from "react";

import { saidBy } from "@pinecall/core/api";
import { useCredentials } from "@pinecall/core/credentials";
import { Card, Empty, Page, PageHead, Refused, TableHead, TableRow } from "../../ui";
import { readEveryPersona, type Persona } from "./door";

const COLUMNS = "minmax(120px, 0.8fr) minmax(130px, 0.9fr) minmax(0, 2fr) minmax(0, 1.2fr)";

export function EveryPersona(): ReactNode {
  const credentials = useCredentials();
  const [personas, setPersonas] = useState<Persona[] | null>(null);
  const [refused, setRefused] = useState<string | null>(null);

  useEffect(() => {
    let gone = false;
    readEveryPersona(credentials)
      .then((read) => !gone && setPersonas(read))
      .catch((failed: unknown) => !gone && setRefused(saidBy(failed)));
    return () => {
      gone = true;
    };
  }, [credentials]);

  return (
    <Page>
      <PageHead
        title="Personas"
        lede="Every synthetic caller written for an agent of the org: who they are, what they want, how they talk. A row opens the caller under its agent, where it is edited and put on a call."
      />
      <Refused>{refused}</Refused>
      <Card>
        <TableHead columns={COLUMNS} labels={["Agent", "Persona", "Goal", "Style"]} padding="10px 16px" />
        {personas?.length === 0 && <Empty>No caller is written yet. Open an agent's Personas, or run pinecall personas add in its directory.</Empty>}
        {personas === null && refused === null && <Empty>Asking the gateway…</Empty>}
        {personas?.map((one) => (
          <TableRow key={`${one.agent}/${one.name}`} columns={COLUMNS} padding="12px 16px" to={`/a/${encodeURIComponent(one.agent)}/personas/${encodeURIComponent(one.name)}`}>
            <span className="ui-clip">{one.agent}</span>
            <span className="ui-clip" style={{ fontWeight: 600 }}>{one.name}</span>
            <span className="ui-clip">{one.goal}</span>
            <span className="ui-clip" style={{ color: "var(--ink-3)" }}>{one.style}</span>
          </TableRow>
        ))}
      </Card>
    </Page>
  );
}
