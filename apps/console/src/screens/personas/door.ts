/** Personas doors: CRUD for an agent's synthetic callers and their runs. */

import { type Persona, PersonaListSchema, type PersonaPut, type PersonaRun, type PersonaRunList, PersonaRunListSchema } from "@pinecall/core/wire/rest-evals";

import { drop, put, read, type Credentials } from "@pinecall/core/api";

export type { Persona, PersonaRun };

export type Written = PersonaPut;

const door = (agent: string, name?: string): string =>
  `/v1/agents/${encodeURIComponent(agent)}/personas${name === undefined ? "" : `/${encodeURIComponent(name)}`}`;

export async function readPersonas(credentials: Credentials, agent: string): Promise<Persona[]> {
  return PersonaListSchema.parse(await read(credentials, door(agent))).personas;
}

/** Create, replace or rename a persona; resolves to the updated list. */
export async function writePersona(credentials: Credentials, agent: string, name: string, written: Written): Promise<Persona[]> {
  return PersonaListSchema.parse(await put(credentials, door(agent, name), written)).personas;
}

/** Delete a persona; resolves to the updated list. */
export async function dropPersona(credentials: Credentials, agent: string, name: string): Promise<Persona[]> {
  return PersonaListSchema.parse(await drop(credentials, door(agent, name))).personas;
}

/** One page of a persona's simulations, newest first; `before` is the previous page's `next`. */
export async function readRuns(
  credentials: Credentials,
  agent: string,
  name: string,
  asked: { before?: string | undefined; limit?: number | undefined } = {},
): Promise<PersonaRunList> {
  const params = { ...(asked.before === undefined ? {} : { before: asked.before }), ...(asked.limit === undefined ? {} : { limit: asked.limit }) };
  return PersonaRunListSchema.parse(await read(credentials, `${door(agent, name)}/runs`, params));
}
