/** Where a harness row and what it lists open, whoever is in view: the same screen under the agent in view, or under the org's row with its owner in the path. */

/** The row itself: `/a/<agent>/<row>` with one agent in view, `/<row>` with every agent. */
export function rowAt(inView: string, row: string): string {
  return inView === "" ? `/${row}` : `/a/${encodeURIComponent(inView)}/${row}`;
}

/**
 * One thing a row lists that belongs to one agent — a persona, a case — opened on the same screen:
 * `/a/<agent>/<row>/<name>` with that agent in view, `/<row>/<owner>/<name>` with every agent, so
 * the screen never changes under the person and the URL still names whose it is.
 */
export function ownedAt(inView: string, row: string, owner: string, name: string): string {
  const named = encodeURIComponent(name);
  return inView === "" ? `/${row}/${encodeURIComponent(owner)}/${named}` : `${rowAt(inView, row)}/${named}`;
}

/** Who a person sees named on a row's screen: the agent in view, or every agent. */
export function whoseIs(inView: string): string {
  return inView === "" ? "every agent" : inView;
}
