/** Series over whole UTC days (GET /v1/insights/series): what the Observability screen draws, polled like the insights. */

import { useEffect, useState } from "react";
import { z } from "zod";

import { GatewayError, read } from "@pinecall/core/api";
import { useCredentials } from "@pinecall/core/credentials";
import type { Asked } from "./insights";

// runtime wire/rest/usage.py: Series. Loose so a new field does not fail the parse.
const StageSchema = z.object({ stage: z.string(), turns: z.number(), median_s: z.number().nullable(), p95_s: z.number().nullable() });
const JudgeSchema = z.object({ name: z.string(), held: z.number(), judged: z.number() });
const DaySchema = z.looseObject({
  day: z.string(),
  calls: z.number(),
  finished: z.number(),
  escalated: z.number(),
  spend_usd: z.number(),
  mean_length_s: z.number().nullable(),
  e2e_median_s: z.number().nullable(),
  e2e_p95_s: z.number().nullable(),
  endings: z.array(z.object({ reason: z.string(), count: z.number() })),
  stages: z.array(StageSchema),
  judges: z.array(JudgeSchema),
  tools_ran: z.number(),
  tools_failed: z.number(),
});
const SeriesSchema = z.looseObject({ day: z.string(), days: z.number(), agent: z.string().nullable(), series: z.array(DaySchema) });

export type Series = z.infer<typeof SeriesSchema>;
/** One UTC day of the window, every number a chart draws. */
export type SeriesDay = Series["series"][number];

const EVERY_MS = 15000;

/** Parse what the door answered; a renamed field is refused. */
export function seriesOf(answered: unknown): Series {
  return SeriesSchema.parse(answered);
}

/** Poll the series; null until loaded, or for good when the gateway refuses with 403/404. */
export function useSeries({ day, days = 7, agent }: Asked = {}): Series | null {
  const credentials = useCredentials();
  const [series, setSeries] = useState<Series | null>(null);
  useEffect(() => {
    let stopped = false;
    let again: number | undefined;
    const params = { days, ...(day === undefined ? {} : { day }), ...(agent === undefined ? {} : { agent }) };
    const ask = async (): Promise<void> => {
      try {
        const answered = seriesOf(await read(credentials, "/v1/insights/series", params));
        if (!stopped) setSeries(answered);
      } catch (refused) {
        if (refused instanceof GatewayError && [403, 404].includes(refused.status)) {
          window.clearInterval(again);
          if (!stopped) setSeries(null);
        }
      }
    };
    void ask();
    again = window.setInterval(() => void ask(), EVERY_MS);
    return () => {
      stopped = true;
      window.clearInterval(again);
    };
  }, [credentials, day, days, agent]);
  return series;
}
