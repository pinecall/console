/** Calls list for the org, or for one agent when the path names it. */

import type { ReactNode } from "react";
import { useParams } from "react-router";

import { useOrg } from "../../lib/org";
import { Page, PageHead } from "../../ui";
import { ConversationList } from "./list";
import "./calls.css";

/** Uses the same org list as the sidebar badge (`@pinecall/core/use-floor`), so both counts match. */
export function Calls(): ReactNode {
  const fixed = useParams()["agent"] ?? "";
  const { lines, floorError, agents } = useOrg();
  // Include agents named by calls, so calls from since-removed agents stay filterable.
  const slugs = [...new Set([...agents.map((one) => one.slug), ...lines.map((line) => line.agent)])].sort();
  const mine = fixed === "" ? lines : lines.filter((line) => line.agent === fixed);
  return (
    <Page tight>
      <PageHead
        title="Calls"
        lede={fixed === "" ? "Every call the org has taken, newest first, whichever agent took it." : `Only what ${fixed} handled, newest first.`}
      />
      <ConversationList lines={mine} error={floorError} agent={fixed} agents={slugs} />
    </Page>
  );
}
