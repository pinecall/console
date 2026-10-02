/** The accounts panel: whose numbers reach the org — Twilio accounts, SIP peers, WhatsApp numbers — listed, added, taken back. */

import { useState, type FormEvent, type ReactNode } from "react";

import { Button, Card, CardHead, Input, Label, Select, SelectItem } from "../../ui";
import type { Carrier, CarrierKind, WantedCarrier } from "./door";

/** What the panel is told: the accounts standing, and the two moves. */
export interface CarrierPanelProps {
  carriers: Carrier[];
  busy: boolean;
  onBring: (wanted: WantedCarrier) => Promise<void>;
  onDrop: (account: string) => Promise<void>;
}

const STANDING: Record<CarrierKind, string> = {
  twilio: "Twilio account",
  sip: "SIP peer",
  whatsapp: "WhatsApp number",
};

/**
 * An org holds as many accounts as it has. Each is named by kind and account and never a secret —
 * the gateway seals the credentials under the vault key and answers the name alone. The form adds
 * one more: a Twilio account (verified once, on adding), a SIP peer with its own username, password
 * and the networks its calls come from, or a WhatsApp number at Meta with its token.
 */
export function CarrierPanel({ carriers, busy, onBring, onDrop }: CarrierPanelProps): ReactNode {
  const [adding, setAdding] = useState(false);
  const form = (carriers.length === 0 || adding) && (
    <CarrierForm
      busy={busy}
      onBring={async (wanted) => {
        await onBring(wanted);
        setAdding(false);
      }}
      onCancel={carriers.length === 0 ? null : () => setAdding(false)}
    />
  );
  if (carriers.length === 0) return form;
  return (
    <>
      <Card>
        <CardHead
          title="Your accounts"
          action={
            !adding ? (
              <Button kind="primary" size="sm" className="ui-card-action" onClick={() => setAdding(true)} disabled={busy}>
                Add an account
              </Button>
            ) : undefined
          }
        />
        {carriers.map((one) => (
          <div key={one.account} className="num-carrier">
            <span className="num-kind">{one.kind.toUpperCase()}</span>
            <span className="num-carrier-standing">{one.label === "" ? STANDING[one.kind] : one.label}</span>
            <span className="num-carrier-account">{one.account}</span>
            <span className="num-carrier-moves">
              <Button size="xs" kind="danger" onClick={() => void onDrop(one.account)} disabled={busy} title="Its numbers keep ringing until each is removed.">
                Disconnect
              </Button>
            </span>
          </div>
        ))}
      </Card>
      {form}
    </>
  );
}

function CarrierForm({ busy, onBring, onCancel }: { busy: boolean; onBring: (wanted: WantedCarrier) => Promise<void>; onCancel: (() => void) | null }): ReactNode {
  const [kind, setKind] = useState<CarrierKind>("twilio");
  const [label, setLabel] = useState("");
  const [accountSid, setAccountSid] = useState("");
  const [user, setUser] = useState("");
  const [secret, setSecret] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [addresses, setAddresses] = useState("");
  const [outHost, setOutHost] = useState("");
  const [outTransport, setOutTransport] = useState<"auto" | "udp" | "tcp" | "tls">("auto");
  const [outUsername, setOutUsername] = useState("");
  const [outPassword, setOutPassword] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const named = label.trim() === "" ? {} : { label: label.trim() };
    const wanted: WantedCarrier =
      kind === "twilio"
        ? { kind, account_sid: accountSid.trim(), user: user.trim() || accountSid.trim(), secret, ...named }
        : kind === "whatsapp"
          ? { kind, phone_number_id: phoneNumberId.trim(), access_token: accessToken.trim(), ...named }
          : {
              kind,
              username: username.trim(),
              password,
              addresses: addresses.split(/[\s,]+/).filter(Boolean),
              // A peer the box only receives from names no outbound host, and sends none of the four.
              ...(outHost.trim() === ""
                ? {}
                : {
                    outbound_host: outHost.trim(),
                    outbound_transport: outTransport,
                    ...(outUsername.trim() === "" ? {} : { outbound_username: outUsername.trim() }),
                    ...(outPassword === "" ? {} : { outbound_password: outPassword }),
                  }),
              ...named,
            };
    void onBring(wanted);
  };

  const segment = (one: CarrierKind, name: string): ReactNode => (
    <button type="button" className={kind === one ? "ui-segment ui-segment-on" : "ui-segment"} onClick={() => setKind(one)}>
      {name}
    </button>
  );

  return (
    <Card>
      <CardHead title="Add an account">
        <div className="ui-segmented num-ways" role="group">
          {segment("twilio", "Twilio")}
          {segment("sip", "SIP peer")}
          {segment("whatsapp", "WhatsApp")}
        </div>
      </CardHead>
      <form onSubmit={submit}>
        <div className="num-fields num-fields-3">
          {kind === "twilio" && (
            <>
              <div>
                <Label>Account SID</Label>
                <Input value={accountSid} onChange={(e) => setAccountSid(e.target.value)} placeholder="AC…" required autoComplete="off" />
              </div>
              <div>
                <Label>API key SID · or the account SID</Label>
                <Input value={user} onChange={(e) => setUser(e.target.value)} placeholder="SK…" autoComplete="off" />
              </div>
              <div>
                <Label>Secret · the key's, or the auth token</Label>
                <Input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} required autoComplete="new-password" />
              </div>
            </>
          )}
          {kind === "sip" && (
            <>
              <div>
                <Label>Username</Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="off" />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
              </div>
              <div>
                <Label>Networks its calls come from · CIDR</Label>
                <Input value={addresses} onChange={(e) => setAddresses(e.target.value)} placeholder="203.0.113.0/24" required autoComplete="off" />
              </div>
            </>
          )}
          {kind === "whatsapp" && (
            <>
              <div>
                <Label>Phone number ID · from Meta's WhatsApp settings</Label>
                <Input value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} placeholder="1171462246041897" required autoComplete="off" />
              </div>
              <div>
                <Label>Access token · a system user's, so it does not expire</Label>
                <Input type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} required autoComplete="new-password" />
              </div>
            </>
          )}
          <div>
            <Label>Label · optional</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Clínica" autoComplete="off" />
          </div>
        </div>
        {kind === "sip" && (
          <div className="num-outbound-group">
            <div className="num-outbound-title">Outbound</div>
            <div className="num-outbound-say">Where this box sends a call it places. Leave empty for a peer you only receive from.</div>
            <div className="num-fields num-fields-4 num-fields-flush">
              <div>
                <Label>Host · and port</Label>
                <Input value={outHost} onChange={(e) => setOutHost(e.target.value)} placeholder="sip.carrier.example:5060" autoComplete="off" />
              </div>
              <div>
                <Label>Transport</Label>
                <Select value={outTransport} onValueChange={(value) => setOutTransport(value as typeof outTransport)}>
                  <SelectItem value="auto">auto</SelectItem>
                  <SelectItem value="udp">udp</SelectItem>
                  <SelectItem value="tcp">tcp</SelectItem>
                  <SelectItem value="tls">tls</SelectItem>
                </Select>
              </div>
              <div>
                <Label>Username · else the one above</Label>
                <Input value={outUsername} onChange={(e) => setOutUsername(e.target.value)} autoComplete="off" />
              </div>
              <div>
                <Label>Password · else the one above</Label>
                <Input type="password" value={outPassword} onChange={(e) => setOutPassword(e.target.value)} autoComplete="new-password" />
              </div>
            </div>
          </div>
        )}
        <div className="num-actions">
          <Button kind="primary" type="submit" disabled={busy}>
            {busy ? "Connecting…" : "Connect"}
          </Button>
          {onCancel !== null && <Button onClick={onCancel}>Cancel</Button>}
          <span className="num-note">
            {kind === "twilio" && "The account is checked once. The credentials are stored encrypted and never shown again."}
            {kind === "sip" && "Calls are accepted only from these networks, with this username and password."}
            {kind === "whatsapp" && "Messages to this number reach the agent you route it to; replies go out on this token."}
          </span>
        </div>
      </form>
    </Card>
  );
}
