/** Hook for an agent's personas, loaded once per agent. */

import { useEffect, useState } from "react";

import { useCredentials } from "@pinecall/core/credentials";
import { readPersonas, type Persona } from "./door";

export function usePersonas(agent: string): {
  personas: Persona[] | null;
  asking: string | null;
  setPersonas: (personas: Persona[]) => void;
} {
  const credentials = useCredentials();
  const [personas, setPersonas] = useState<Persona[] | null>(null);
  const [asking, setAsking] = useState<string | null>(null);

  useEffect(() => {
    let gone = false;
    setAsking("Asking the gateway…");
    readPersonas(credentials, agent).then(
      (read) => {
        if (gone) return;
        setPersonas(read);
        setAsking(null);
      },
      (failed: unknown) => {
        if (!gone) setAsking(failed instanceof Error ? failed.message : String(failed));
      },
    );
    return () => {
      gone = true;
    };
  }, [credentials, agent]);

  return { personas, asking, setPersonas };
}
