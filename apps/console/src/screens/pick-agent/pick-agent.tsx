/** A harness row that is one agent's — Simulations, Personas — opened with every agent in view: the org's agents, each a way into that screen with it in view. */

import type { ReactNode } from "react";
import { useLocation } from "react-router";

import { screenAt } from "../../lib/mode";
import { useOrg } from "../../lib/org";
import { Avatar, Card, Empty, Item, Page, PageHead, Refused } from "../../ui";
import "./pick-agent.css";

// What each row is for, said once where the reader is asked to choose.
const WHAT: Record<string, string> = {
  simulations: "A simulation puts a synthetic caller on one agent, live, and scores the call. Pick the agent.",
  personas: "Personas are the callers written for one agent, the ones its simulations play. Pick the agent.",
};

export function PickAgent(): ReactNode {
  const { pathname } = useLocation();
  const { agents, agentsLoaded, agentsError } = useOrg();
  const screen = screenAt(pathname);
  if (screen === undefined) return null;

  return (
    <Page width={760}>
      <PageHead title={screen.name} lede={WHAT[screen.key]} />
      <Refused>{agentsError}</Refused>
      <Card>
        {agentsLoaded && agents.length === 0 && <Empty>No agent is running in this world yet: start one, and it is listed here.</Empty>}
        {agents.map((one) => (
          <Item
            key={one.slug}
            to={`/a/${encodeURIComponent(one.slug)}/${screen.path}`}
            name={
              <span className="pick-agent-name">
                <Avatar size={26} name={one.slug} letters={one.slug.slice(0, 1).toUpperCase()} />
                {one.slug}
              </span>
            }
            sub={one.channels.join(" · ")}
          />
        ))}
      </Card>
    </Page>
  );
}
