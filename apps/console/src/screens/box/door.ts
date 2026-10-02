/** Operator doors for orgs: quotas, dialling, keys, members, vendor keys and SSO. */

import { z } from "zod";

import { drop, post, put, read, type Credentials } from "@pinecall/core/api";

const OPS = "/v1/ops";
const at = (named: string): string => `${OPS}/orgs/${encodeURIComponent(named)}`;

// Runtime order (types/org.py). `null` = unlimited, `0` = refuse all. `budget_usd` is monthly.
export const QUOTAS = ["minutes", "messages", "agents", "concurrent_calls", "memory_facts", "knowledge_chunks", "numbers", "seats", "budget_usd"] as const;
export type Quota = (typeof QUOTAS)[number];

const aLimit = z.number().nullish();

// Loose schemas so new fields never break the operator page.
const OrgSchema = z.looseObject({ id: z.string(), slug: z.string(), name: z.string() });
export type Org = z.infer<typeof OrgSchema>;

const DiallingSchema = z.looseObject({
  dial_anywhere: z.boolean(),
  per_minute: z.number(),
  per_day: z.number(),
  max_duration_s: z.number(),
});
export type Dialling = z.infer<typeof DiallingSchema>;

const OneOrgSchema = OrgSchema.extend({
  quotas: z.looseObject({
    minutes: aLimit,
    messages: aLimit,
    agents: aLimit,
    concurrent_calls: aLimit,
    memory_facts: aLimit,
    knowledge_chunks: aLimit,
    numbers: aLimit,
    seats: aLimit,
    budget_usd: aLimit,
  }),
  // Absent on older gateways.
  dialling: DiallingSchema.nullish(),
  holding: z.looseObject({ memory_facts: z.number(), knowledge_chunks: z.number(), numbers: z.number(), seats: z.number() }),
});
export type OneOrg = z.infer<typeof OneOrgSchema>;

const ListedKeySchema = z.looseObject({
  fingerprint: z.string(),
  label: z.string().nullish(),
  created_at: z.string(),
  revoked_at: z.string().nullish(),
  env: z.string(),
  scopes: z.array(z.string()),
  subject: z.string().nullish(),
  name: z.string().nullish(),
});
export type ListedKey = z.infer<typeof ListedKeySchema>;

// The only response with a plaintext key: show once, never store.
const IssuedSchema = z.looseObject({ key: z.string(), key_id: z.string(), label: z.string().nullish(), env: z.string(), scopes: z.array(z.string()) });
export type Issued = z.infer<typeof IssuedSchema>;

const MemberSchema = z.looseObject({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.string(),
  agents: z.array(z.string()),
  status: z.string(),
  operator: z.boolean().nullish(),
});
export type Member = z.infer<typeof MemberSchema>;

const InvitedSchema = z.looseObject({ member: MemberSchema, token: z.string().nullish(), expires_at: z.string().nullish(), mailed: z.boolean().nullish() });
export type Invited = z.infer<typeof InvitedSchema>;

const SsoSchema = z.looseObject({ configured: z.boolean(), issuer: z.string().nullish(), domains: z.array(z.string()).nullish(), required: z.boolean() });
export type Sso = z.infer<typeof SsoSchema>;

// ── orgs ────────────────────────────────────────────────────────────────────────

/** All orgs, oldest first. */
export async function readOrgs(credentials: Credentials): Promise<Org[]> {
  return z.array(OrgSchema).parse(await read(credentials, `${OPS}/orgs`));
}

/** One org by id or slug, with quotas, dialling and holdings. */
export async function readOrg(credentials: Credentials, named: string): Promise<OneOrg> {
  return OneOrgSchema.parse(await read(credentials, at(named)));
}

/** Create an org; the gateway assigns the id and validates the slug. */
export async function addOrg(credentials: Credentials, slug: string, name: string): Promise<Org> {
  return OrgSchema.parse(await post(credentials, `${OPS}/orgs`, { slug, name: name || null }));
}

/** Delete an org; refused while a live key or route references it. */
export async function removeOrg(credentials: Credentials, named: string): Promise<void> {
  await drop(credentials, at(named));
}

/** Replace all quotas; an omitted one becomes unlimited. */
export async function saveQuotas(credentials: Credentials, named: string, wanted: Partial<Record<Quota, number | null>>): Promise<void> {
  await put(credentials, `${at(named)}/quotas`, wanted);
}

/** Replace outbound guards; an omitted one reverts to the default. */
export async function saveDialling(credentials: Credentials, named: string, wanted: Dialling): Promise<void> {
  await put(credentials, `${at(named)}/dialling`, wanted);
}

/** Move an agent (with its logs and numbers) into this org. */
export async function moveAgent(credentials: Credentials, named: string, agent: string): Promise<{ logs: number; numbers: string[] }> {
  return z.looseObject({ logs: z.number(), numbers: z.array(z.string()) }).parse(await put(credentials, `${at(named)}/agents`, { agent }));
}

// ── keys ────────────────────────────────────────────────────────────────────────

export async function readKeys(credentials: Credentials, named: string): Promise<ListedKey[]> {
  return z.array(ListedKeySchema).parse(await read(credentials, `${at(named)}/keys`));
}

/** Issue a machine key; `scopes: null` grants every scope. */
export async function issueKey(credentials: Credentials, named: string, wanted: { label: string; env: string; scopes: string[] | null }): Promise<Issued> {
  return IssuedSchema.parse(await post(credentials, `${at(named)}/keys`, wanted));
}

export async function revokeKey(credentials: Credentials, fingerprint: string): Promise<void> {
  await post(credentials, `${OPS}/keys/${encodeURIComponent(fingerprint)}/revoke`, {});
}

// ── members ─────────────────────────────────────────────────────────────────────

export async function readMembers(credentials: Credentials, named: string): Promise<{ members: Member[]; seated: number }> {
  return z.looseObject({ members: z.array(MemberSchema), seated: z.number() }).parse(await read(credentials, `${at(named)}/members`));
}

/** Operator invitation; takes no seat. Used to seat the first admin of an org. */
export async function inviteTo(credentials: Credentials, named: string, who: { email: string; name: string; role: string; agents: string[] }): Promise<Invited> {
  return InvitedSchema.parse(await post(credentials, `${at(named)}/members`, who));
}

/** Grant or revoke box operator; org permissions are unaffected. */
export async function makeOperator(credentials: Credentials, named: string, id: string, operator: boolean): Promise<void> {
  await put(credentials, `${at(named)}/members/${encodeURIComponent(id)}/operator`, { operator });
}

/** Remove a member permanently (404/405 on older gateways). */
export async function removeMember(credentials: Credentials, named: string, id: string): Promise<void> {
  await drop(credentials, `${at(named)}/members/${encodeURIComponent(id)}`);
}

// ── vendor keys and SSO ─────────────────────────────────────────────────────────

/** Vendors the org has its own key for; values are never returned. */
export async function readVendors(credentials: Credentials, named: string): Promise<string[]> {
  return z.looseObject({ vendors: z.array(z.string()) }).parse(await read(credentials, `${at(named)}/provider-keys`)).vendors;
}

/** Set the org's key for a vendor; write-only. */
export async function bringVendor(credentials: Credentials, named: string, vendor: string, key: string): Promise<void> {
  await put(credentials, `${at(named)}/provider-keys/${encodeURIComponent(vendor)}`, { key });
}

/** Revert a vendor to the box's key, from the next call. */
export async function forgetVendor(credentials: Credentials, named: string, vendor: string): Promise<void> {
  await drop(credentials, `${at(named)}/provider-keys/${encodeURIComponent(vendor)}`);
}

/** The org's SSO config, or null if unavailable. */
export async function readSso(credentials: Credentials, named: string): Promise<Sso | null> {
  try {
    return SsoSchema.parse(await read(credentials, `${at(named)}/sso`));
  } catch {
    return null;
  }
}

/** Set whether SSO is required; `false` is the break-glass that re-enables passwords. */
export async function requireSso(credentials: Credentials, named: string, required: boolean): Promise<void> {
  await put(credentials, `${at(named)}/sso/required`, { required });
}
