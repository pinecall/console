/** Who set a monitor, by name: the org's people read once, for a key that may read them. */

import { useEffect, useState } from "react";

import { useCredentials } from "@pinecall/core/credentials";
import { readMembers } from "@pinecall/core/members";
import { useScopes } from "../../lib/whoami";

/** A member's name, else their email, by id — empty until read, and for a key without `team`. */
export function useNames(): ReadonlyMap<string, string> {
  const credentials = useCredentials();
  const scopes = useScopes();
  const [names, setNames] = useState<ReadonlyMap<string, string>>(new Map());
  const mayRead = scopes !== null && scopes.includes("team");

  useEffect(() => {
    if (!mayRead) return;
    let gone = false;
    readMembers(credentials)
      .then((members) => {
        if (!gone) setNames(new Map(members.map((one) => [one.id, one.name ?? one.email])));
      })
      .catch(() => undefined);
    return () => {
      gone = true;
    };
  }, [credentials, mayRead]);

  return names;
}
