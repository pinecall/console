/** Cases: the agent's cases (or every agent's) down the left, the one chosen read beside them, the loop when none is. */

import type { ReactNode } from "react";
import { useParams } from "react-router";

import { usePane } from "../../ui";
import { CaseRoster } from "./roster";
import { CaseView } from "./case-view";
import { TheLoop } from "./the-loop";
import { useCases } from "./use-cases";
import "./cases.css";

/**
 * The screen, under one agent or with every agent in view. A case is the org's — kept by the
 * gateway, the same in both worlds — and the URL names the one open: `/a/<agent>/cases/<name>`;
 * with every agent in view a row opens the case under its own agent. What this page decides is what
 * `pinecall cases` and the nightly's `pinecall test --dataset` read, with no deploy between.
 */
export function Cases(): ReactNode {
  const agent = useParams()["agent"] ?? "";
  const open = useParams()["call"];
  const pane = usePane({ name: "cases.list", initial: 340, min: 280, max: 520, side: "left" });
  const { listed, asking, decided } = useCases(agent);
  const chosen = listed?.cases.find((kept) => kept.name === open);

  return (
    <div className="cs" style={pane.style}>
      {pane.handle}
      <CaseRoster agent={agent} listed={listed} asking={asking} open={chosen?.name} />
      <main className="cs-main">
        {chosen === undefined ? <TheLoop agent={agent} listed={listed} /> : <CaseView key={chosen.id} agent={agent} kept={chosen} onDecided={decided} />}
      </main>
    </div>
  );
}
