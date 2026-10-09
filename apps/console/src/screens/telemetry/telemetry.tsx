/** Telemetry: where the org sends its calls' traces — an OpenTelemetry collector of its own, set with its headers, never shown. */

import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { saidBy } from "@pinecall/core/api";
import { useCredentials } from "@pinecall/core/credentials";
import { Button, Card, Check, Empty, Field, Input, KV, Page, PageHead, Refused, TextAction } from "../../ui";
import { dropCollector, putCollector, readCollector, type Collector } from "../../lib/telemetry";

/** One header of the form: a name and a value, the value sent once and never read back. */
interface Header {
  name: string;
  value: string;
}

/**
 * Every call's spans — the model's requests, speech in and out, every tool — go over OTLP to the
 * collector named here, beside Pinecall's own. The headers are a credential: typed here, sent
 * once, and the gateway keeps them sealed; the page reads back their names alone.
 */
export function Telemetry(): ReactNode {
  const credentials = useCredentials();
  const [collector, setCollector] = useState<Collector | null | undefined>(undefined);
  const [endpoint, setEndpoint] = useState("");
  const [headers, setHeaders] = useState<Header[]>([{ name: "", value: "" }]);
  const [pii, setPii] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);

  useEffect(() => {
    let gone = false;
    readCollector(credentials).then(
      (found) => {
        if (!gone) setCollector(found);
      },
      (failed: unknown) => {
        if (!gone) setRefused(saidBy(failed));
      },
    );
    return () => {
      gone = true;
    };
  }, [credentials]);

  const save = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const url = endpoint.trim();
    const named = headers.filter((one) => one.name.trim() !== "" || one.value !== "");
    const half = named.find((one) => one.name.trim() === "" || one.value === "");
    if (!/^https?:\/\//.test(url)) {
      setRefused("The collector is an http(s) URL an OTLP exporter can post to.");
      return;
    }
    if (half !== undefined) {
      setRefused("A header has a name and a value.");
      return;
    }
    setBusy(true);
    setRefused(null);
    try {
      await putCollector(credentials, url, Object.fromEntries(named.map((one) => [one.name.trim(), one.value])), pii);
      setCollector(await readCollector(credentials));
      setEndpoint("");
      setHeaders([{ name: "", value: "" }]);
    } catch (failed) {
      setRefused(saidBy(failed));
    } finally {
      setBusy(false);
    }
  };

  const forget = async (): Promise<void> => {
    if (!window.confirm("Stop sending traces to this collector? They stay on Pinecall either way.")) return;
    setRefused(null);
    try {
      await dropCollector(credentials);
      setCollector(null);
    } catch (failed) {
      setRefused(saidBy(failed));
    }
  };

  const setHeader = (at: number, change: Partial<Header>): void => {
    setHeaders(headers.map((one, index) => (index === at ? { ...one, ...change } : one)));
  };

  return (
    <Page tight>
      <PageHead
        title="Telemetry"
        ledeWidth={660}
        lede="Where the org sends its calls' traces: an OpenTelemetry collector of its own — Datadog, Grafana, Langfuse, Honeycomb, Cekura, or one you run — beside Pinecall's. Every span carries pinecall.org, pinecall.env, pinecall.agent and pinecall.call, so one call is one trace there."
      />

      <Card>
        {collector === undefined ? null : collector === null ? (
          <Empty>Traces go nowhere but Pinecall. Name a collector below, or with `pinecall telemetry set`.</Empty>
        ) : (
          <>
            <KV label="Collector">{collector.endpoint}</KV>
            <KV label="Headers">{collector.header_names.length > 0 ? collector.header_names.join(", ") : "none"}</KV>
            <KV label="What was said">{collector.pii ? "carried on the spans" : "stripped before export: the timings, tokens and names stay"}</KV>
            <TextAction danger onClick={() => void forget()}>
              Stop sending
            </TextAction>
          </>
        )}
      </Card>

      <Card pad>
        <form className="ui-form" onSubmit={(event) => void save(event)}>
          <Field label="Collector, an OTLP/HTTP traces URL" grow minWidth={320}>
            <Input value={endpoint} placeholder="https://otlp.datadoghq.eu/v1/traces" autoComplete="off" spellCheck={false} onChange={(event) => setEndpoint(event.target.value)} />
          </Field>
          {headers.map((one, at) => (
            <div key={at} className="ui-form">
              <Field label="Header" minWidth={180}>
                <Input value={one.name} placeholder="dd-api-key" autoComplete="off" spellCheck={false} onChange={(event) => setHeader(at, { name: event.target.value })} />
              </Field>
              <Field label="Value, sent once" grow minWidth={220}>
                <Input type="password" value={one.value} autoComplete="new-password" onChange={(event) => setHeader(at, { value: event.target.value })} />
              </Field>
            </div>
          ))}
          <TextAction onClick={() => setHeaders([...headers, { name: "", value: "" }])}>Another header</TextAction>
          <Check checked={pii} onChange={setPii}>
            Let the spans carry what was said and what a tool got
          </Check>
          <Button kind="primary" size="form" type="submit" disabled={busy || endpoint.trim() === ""}>
            {busy ? "Saving…" : collector ? "Replace" : "Save"}
          </Button>
        </form>
      </Card>

      <Refused>{refused}</Refused>
    </Page>
  );
}
