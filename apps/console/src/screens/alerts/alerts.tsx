/** Alerts, a tab of Settings: where the org's alerts are posted — a webhook of its own, set with a secret, proven with a test — beside the bell. */

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router";

import { saidBy } from "@pinecall/core/api";
import { useCredentials } from "@pinecall/core/credentials";
import { Button, Card, CardHead, Empty, Field, Input, KV, Page, PageHead, Refused, TextAction } from "../../ui";
import { dropWebhook, putWebhook, readWebhook, testWebhook, type Webhook } from "./door";
import "./alerts.css";

/** What is posted, in the order a person meets it. */
const POSTED: { type: string; when: string }[] = [
  { type: "monitor.fired", when: "a number the org watches crossed its line over its window — once a day per monitor" },
  { type: "spend.unusual", when: "today's calls cost three times the org's usual day — once a day" },
  { type: "credits.exhausted", when: "a call, a written turn or a register was refused because a quota ran out" },
];

const A_POST = `POST <your URL>
content-type: application/json
x-pinecall-event: monitor.fired
x-pinecall-signature: sha256=<HMAC-SHA256 of the body, with your secret>

{"type":"monitor.fired","org":"org_…","env":"production","agent":"front-desk","at":1791567316.2,
 "data":{"monitor":"mon_…","name":"slow answers","metric":"e2e_median_s","above":true,
         "threshold":2.0,"value":2.41,"window_days":7,"agent":null,"env":"production","day":"2026-10-09"}}`;

/**
 * Every alert is written on the agent's log; this is where it also goes out. The secret is a
 * credential: typed here, sent once, kept sealed by the gateway, and the page reads back only
 * whether posts are signed.
 */
export function Alerts(): ReactNode {
  const credentials = useCredentials();
  const [webhook, setWebhook] = useState<Webhook | null | undefined>(undefined);
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const [tested, setTested] = useState<string | null>(null);

  useEffect(() => {
    let gone = false;
    readWebhook(credentials).then(
      (found) => {
        if (!gone) setWebhook(found);
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
    const wanted = url.trim();
    if (!/^https?:\/\//.test(wanted)) {
      setRefused("The webhook is an http(s) URL an alert can be posted to.");
      return;
    }
    setBusy(true);
    setRefused(null);
    setTested(null);
    try {
      await putWebhook(credentials, wanted, secret === "" ? null : secret);
      setWebhook(await readWebhook(credentials));
      setUrl("");
      setSecret("");
    } catch (failed) {
      setRefused(saidBy(failed));
    } finally {
      setBusy(false);
    }
  };

  const test = async (): Promise<void> => {
    setBusy(true);
    setRefused(null);
    try {
      const answer = await testWebhook(credentials);
      setTested(answer.sent ? "It answered 2xx: the test post went through, signed as every alert is." : `It did not take it — ${answer.error ?? "no answer"}.`);
    } catch (failed) {
      setRefused(saidBy(failed));
    } finally {
      setBusy(false);
    }
  };

  const forget = async (): Promise<void> => {
    if (!window.confirm("Stop posting alerts to this URL? They stay on the agents' logs and in the bell either way.")) return;
    setRefused(null);
    setTested(null);
    try {
      await dropWebhook(credentials);
      setWebhook(null);
    } catch (failed) {
      setRefused(saidBy(failed));
    }
  };

  return (
    <Page tight>
      <PageHead
        title="Alerts"
        ledeWidth={660}
        lede={
          <>
            Where the org's alerts go beyond the agent's log and the bell: a webhook of your own — Slack, PagerDuty, your backend. What the bell tells each person is their own choice, under{" "}
            <Link to="/notifications">Notifications</Link>.
          </>
        }
      />

      <Card pad>
        {webhook === undefined ? null : webhook === null ? (
          <Empty>Alerts are posted nowhere yet. Name a URL below, or with `pinecall webhook set`.</Empty>
        ) : (
          <>
            <KV label="Webhook">{webhook.url}</KV>
            <KV label="Signed">{webhook.signed ? "every post, x-pinecall-signature with your secret" : "no: set a secret to sign them"}</KV>
            <div className="alr-line">
              <Button size="sm" disabled={busy} onClick={() => void test()}>
                Send a test
              </Button>
              <TextAction danger onClick={() => void forget()}>
                Stop posting
              </TextAction>
              {tested !== null && <span className="alr-tested">{tested}</span>}
            </div>
          </>
        )}
      </Card>

      <Card pad>
        <form className="ui-form" onSubmit={(event) => void save(event)}>
          <Field label="Webhook, an http(s) URL" grow minWidth={320}>
            <Input value={url} placeholder="https://hooks.slack.com/…" autoComplete="off" spellCheck={false} onChange={(event) => setUrl(event.target.value)} />
          </Field>
          <Field label="Secret, sent once" minWidth={220}>
            <Input type="password" value={secret} autoComplete="new-password" onChange={(event) => setSecret(event.target.value)} />
          </Field>
          <Button kind="primary" size="form" type="submit" disabled={busy || url.trim() === ""}>
            {busy ? "Saving…" : webhook ? "Replace" : "Save"}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHead title="What is posted" meta="each as it is written on the agent's log, tried twice within five seconds" />
        {POSTED.map((one) => (
          <KV key={one.type} label={<code className="alr-type">{one.type}</code>}>
            {one.when}
          </KV>
        ))}
        <pre className="alr-post">{A_POST}</pre>
      </Card>

      <Refused>{refused}</Refused>
    </Page>
  );
}
