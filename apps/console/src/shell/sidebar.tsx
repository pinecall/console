/** The sidebar: the workspace, search, the agents as a tree — the open one showing its screens — the org's rows, and who is signed in. */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router";

import { GatewayError } from "@pinecall/core/api";
import { AGENT_SCREENS, BOX_SCREENS, ORG_SCREENS, rowOf, rowsOf, screenAt, tabsOf, WORLD, type Screen } from "../lib/mode";
import { useOrg } from "../lib/org";
import { opens } from "@pinecall/core/scopes";
import { orgOf, useScopes, useWhoami } from "../lib/whoami";
import { useWorld } from "../lib/world";
import { Avatar, Icon, initialsOf } from "../ui";

/** Whether the screen at this path is the row itself or one of its tabs — what lights the row. */
function onRowAt(path: string, table: readonly Screen[], row: Screen): boolean {
  const at = screenAt(path);
  return at !== undefined && rowOf(table, at).key === row.key;
}

export function Sidebar({ agent, onSearch }: { agent: string; onSearch: () => void }): ReactNode {
  const [folded, setFolded] = useState(false);
  const scopes = useScopes();
  const whose = useWhoami();
  const { agents, live, here, operator } = useOrg();
  const { pathname } = useLocation();
  const open = (screen: Screen): boolean => scopes === null || opens(scopes, screen.key);
  const person = whose?.name ?? whose?.label ?? "";
  const role = here?.role ?? (whose === null ? "" : whose.subject === null || whose.subject === undefined ? "a machine's key" : "");

  // A row lands on itself, or — a row that is only a place for its tabs — on the first tab this
  // key opens. A row none of whose tabs open is not drawn: a link to nothing is a 403 on a click.
  const landing = (table: readonly Screen[], row: Screen, prefix: string): string | null => {
    const tabs = tabsOf(table, row).filter(open);
    const first = tabs[0];
    if (first === undefined) return null;
    return `${prefix}/${first.path}`;
  };

  const orgRows = rowsOf([...ORG_SCREENS, ...BOX_SCREENS], WORLD, operator === true);
  const boxRows = orgRows.filter((row) => row.operator === true);

  return (
    <aside className={folded ? "side side-folded" : "side"} aria-label="Screens">
      <Workspace />

      <div className="side-search-wrap">
        <button type="button" className="side-search" onClick={onSearch} title="Search">
          <Icon name="search" size={15} />
          <span className="side-label">Search</span>
          <span className="side-kbd">⌘K</span>
        </button>
      </div>

      <nav className="side-nav">
        <div className="side-group side-group-first">
          <span>Agents</span>
          {agents.length > 0 && <span className="side-group-count">{agents.length}</span>}
        </div>
        {agents.length === 0 && <div className="side-none side-name">none held here</div>}
        {agents.map((held) => {
          const onCalls = live.filter((line) => line.agent === held.slug).length;
          const on = held.slug === agent;
          return (
            <div key={held.slug} className={on ? "side-agent side-agent-open" : "side-agent"}>
              <NavLink to={`/a/${held.slug}/overview`} title={held.slug} className={on ? "side-link side-link-agent side-link-on" : "side-link side-link-agent"}>
                <Avatar size={20} name={held.slug} letters={held.slug.slice(0, 1).toUpperCase()} />
                <span className="side-name side-name-agent">{held.slug}</span>
                {onCalls > 0 ? <span className="side-badge side-badge-live">{onCalls} live</span> : on ? <span className="side-chevron">▾</span> : <span className="side-dot" />}
              </NavLink>
              {/* The open agent's screens hang under its name: everything that is one agent's is
                  reached from here and nowhere else, so nothing of an agent's is in the org's rows. */}
              {on && (
                <div className="side-tree">
                  {rowsOf(AGENT_SCREENS)
                    .map((row) => ({ row, to: landing(AGENT_SCREENS, row, `/a/${held.slug}`) }))
                    .filter((one): one is { row: Screen; to: string } => one.to !== null)
                    .map(({ row, to }) => (
                      <NavLink key={row.key} to={to} title={row.name} className={onRowAt(pathname, AGENT_SCREENS, row) ? "side-link side-link-leaf side-link-on" : "side-link side-link-leaf"}>
                        <span className="side-icon">{row.icon !== undefined && <Icon name={row.icon} size={15} />}</span>
                        <span className="side-name">{row.name}</span>
                      </NavLink>
                    ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="side-group">Organization</div>
        {orgRows
          .filter((row) => row.operator !== true)
          .map((row) => ({ row, to: landing(ORG_SCREENS, row, "") }))
          .filter((one): one is { row: Screen; to: string } => one.to !== null)
          .map(({ row, to }) => (
            <NavLink key={row.key} to={to} end={row.path === ""} title={row.name} className={agent === "" && onRowAt(pathname, ORG_SCREENS, row) ? "side-link side-link-on" : "side-link"}>
              <span className="side-icon">{row.icon !== undefined && <Icon name={row.icon} />}</span>
              <span className="side-name">{row.name}</span>
            </NavLink>
          ))}

        {boxRows.length > 0 && (
          <>
            <div className="side-group">Box</div>
            {boxRows.map((row) => (
              <NavLink key={row.key} to={`/${row.path}`} title={row.name} className={({ isActive }) => (isActive ? "side-link side-link-on" : "side-link")}>
                <span className="side-icon">{row.icon !== undefined && <Icon name={row.icon} />}</span>
                <span className="side-name">{row.name}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="side-foot">
        <div className="side-user" title={person}>
          <span className="side-user-avatar">{initialsOf(person || (whose === null ? "?" : orgOf(whose)))}</span>
          <span className="side-label">
            <span className="side-user-name">{person || "—"}</span>
            <span className="side-user-role">{capitalised(role)}</span>
          </span>
        </div>
        <button type="button" className="side-fold" onClick={() => setFolded(!folded)} title={folded ? "Open the sidebar" : "Collapse the sidebar"}>
          <Icon name="panel" size={15} />
        </button>
      </div>
    </aside>
  );
}

function capitalised(word: string): string {
  return word === "" ? "" : word.charAt(0).toUpperCase() + word.slice(1);
}

/** The org this console is in, how many agents it holds, and — on the gateway's page — the move to another of the person's. */
function Workspace(): ReactNode {
  const whose = useWhoami();
  const { agents, orgs } = useOrg();
  const { moveTo } = useWorld();
  const [open, setOpen] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const path = useLocation().pathname;

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const away = (event: MouseEvent): void => {
      if (box.current !== null && !box.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  const org = whose === null ? "" : orgOf(whose);
  // Another org is another key, minted for the same person (POST /v1/login/org) on either console:
  // a person of two orgs writes agents for both.
  const canMove = orgs !== null && orgs.length > 1;

  const move = async (target: string): Promise<void> => {
    setBusy(true);
    setRefused(null);
    try {
      await moveTo(target);
    } catch (failed) {
      setRefused(failed instanceof GatewayError ? failed.message : String(failed));
      setBusy(false);
    }
  };

  return (
    <div ref={box} className="side-workspace-wrap">
      <button type="button" className="side-workspace" onClick={() => canMove && setOpen(!open)} title={org} aria-expanded={open}>
        <span className="side-tile">{initialsOf(org || "?").slice(0, 1)}</span>
        <span className="side-label">
          <span className="side-org">{org || "…"}</span>
          <span className="side-org-sub">
            {whose?.visiting === true ? "visiting as operator · " : ""}
            {WORLD === "sandbox" ? "sandbox" : "production"} · {agents.length} {agents.length === 1 ? "agent" : "agents"}
          </span>
        </span>
        <span className="side-caret">▾</span>
      </button>
      {open && orgs !== null && (
        <div className="side-orgs" role="menu">
          {[
            { label: "Your organizations", rows: orgs.filter((one) => one.member !== false) },
            { label: "Every other org on this box · as operator", rows: orgs.filter((one) => one.member === false) },
          ]
            .filter((group) => group.rows.length > 0)
            .map((group) => (
              <div key={group.label}>
                <div className="side-orgs-label">{group.label}</div>
                {group.rows.map((one) => (
                  <button key={one.org} type="button" className="side-org-row" disabled={busy || one.here} onClick={() => void move(one.org)}>
                    <span className="side-tile">{initialsOf(one.slug ?? one.name ?? one.org).slice(0, 1)}</span>
                    <span className="ui-clip">{one.slug ?? one.name ?? one.org}</span>
                    <span className="side-org-role">{one.here ? "here" : one.role}</span>
                  </button>
                ))}
              </div>
            ))}
          {refused !== null && <div className="ui-refused" style={{ padding: "6px 8px" }}>{refused}</div>}
        </div>
      )}
    </div>
  );
}
