/** Shown when the person's org does not allow them in production. */

import type { ReactNode } from "react";

import { BASE } from "../../lib/base";
import { crossOver, elsewhere } from "../../lib/mode";
import { forgetKey } from "../../lib/session-key";
import { TextAction } from "../../ui";
import { WayIn } from "./way-in";

/** Explains why, opens the sandbox at its own name signed in as this person, and offers another sign-in. */
export function NoProduction({ said, keyHeld }: { said: string; keyHeld: string }): ReactNode {
  const sandbox = elsewhere();
  const leave = (): void => {
    void forgetKey();
    window.location.assign(BASE);
  };
  const openTheSandbox = (): void => {
    if (sandbox !== null) crossOver(sandbox, "/", { base: BASE, key: keyHeld });
  };
  return (
    <WayIn foot={<>The sandbox is open to you: it is where things are tried before the public sees them.</>}>
      <h1 className="login-title">No production access</h1>
      <p className="login-lede">{said}</p>
      {sandbox !== null && <TextAction onClick={openTheSandbox}>Open the sandbox</TextAction>}
      <TextAction onClick={leave}>Sign in as somebody else</TextAction>
    </WayIn>
  );
}
