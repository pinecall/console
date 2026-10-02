/** The pipeline report's medians: the five latencies and the runtime's two newer measures all read. */
import { expect, test } from "vitest";

import { MeasuredSchema } from "../src/screens/pipeline/door";

test("dead air and the agent's talk share parse beside the five latencies", () => {
  for (const name of ["e2e_latency", "dead_air", "talk_share"]) {
    expect(MeasuredSchema.parse({ name, seconds: 0.4, turns: 3 }).name).toBe(name);
  }
  expect(() => MeasuredSchema.parse({ name: "made_up", seconds: 1, turns: 1 })).toThrow();
});
