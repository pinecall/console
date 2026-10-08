/** A golden's expect said in words, one sentence a judge will hold the replay to. */

import type { Expect } from "@pinecall/core/wire/rest-evals";

export function expectations(expect: Expect): string[] {
  const said: string[] = [];
  for (const tool of expect.tools ?? []) said.push(`calls ${tool}`);
  for (const tool of expect.not_tools ?? []) said.push(`never calls ${tool}`);
  for (const phrase of expect.says ?? []) said.push(`says “${phrase}”`);
  if ((expect.says_any ?? []).length > 0) said.push(`says one of ${(expect.says_any ?? []).map((phrase) => `“${phrase}”`).join(", ")}`);
  for (const phrase of expect.not ?? []) said.push(`never says “${phrase}”`);
  if (expect.grounded === true) said.push("states no price, hour, date or name the call did not carry (grounded)");
  if (expect.register !== undefined && expect.register !== null) said.push(`addresses the caller as ${expect.register}`);
  if (expect.replies === true) said.push("takes up what your backend sent mid-call");
  if (expect.replies === false) said.push("carries on without taking up what your backend sent");
  for (const judge of expect.judges ?? []) said.push(`${judge} holds when the judge is asked again`);
  if (said.length === 0) said.push("nothing yet: a call that held gives no expectation. Write what the agent must keep doing.");
  return said;
}
