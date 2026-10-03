/** Add a number: one question first — where does the number live — then the form of that way. */

import { useEffect, type ReactNode } from "react";

import { Button } from "../../ui";
import { BuyWay, GuidedWay, PbxWay, TwilioWay, WhatsAppWay, type WayProps } from "./add-ways";
import type { Catalog } from "./door";
import { waysOffered, type Way } from "./ways";

const HOW_SAID: Record<Way["how"], string> = { automatic: "Automatic", guided: "Guided", reviewed: "Reviewed" };

const LOGO: Record<string, string> = { buy: "P", twilio: "Tw", pbx: "IP", whatsapp: "WA" };

/** What the sheet is told: the catalog it offers ways from, the way chosen, and what each form needs. */
export interface AddNumberProps extends WayProps {
  catalog: Catalog;
  world: string;
  way: string | null;
  onWay: (way: string | null) => void;
  onClose: () => void;
}

/**
 * Each way says how much of it is the org's work: automatic (the box does it all, showing what will
 * happen before it does), guided (one address pasted in the carrier's portal), reviewed (the box's
 * operator approves the PBX's addresses once). A carrier the operator did not admit is not offered.
 */
export function AddNumber({ catalog, world, way, onWay, onClose, ...props }: AddNumberProps): ReactNode {
  const ways = waysOffered(catalog);
  const chosen = ways.find((one) => one.id === way) ?? null;

  useEffect(() => {
    const closing = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closing);
    return () => window.removeEventListener("keydown", closing);
  }, [onClose]);

  return (
    <>
      <div className="num-scrim" onClick={onClose} />
      <section className="num-sheet" aria-label="Add a number">
        <div className="num-sheet-head">
          <span className="num-sheet-title">Add a number</span>
          <span className="num-sheet-world">in {world}</span>
          <Button size="xs" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="num-sheet-body">
          <div className="num-wizard">
            <b>1 Where it lives</b>
            <i>›</i>
            {chosen === null ? <span>2 Connect</span> : <b>2 {chosen.name}</b>}
          </div>
          <div>
            <div className="num-q">Where does the number live?</div>
            <div className="num-q-sub">Automatic: we set everything up. Guided: you paste one address in their portal. Reviewed: the box operator approves your addresses once.</div>
          </div>
          <div className="num-choices">
            {ways.map((one) => (
              <button key={one.id} type="button" className="num-choice" aria-pressed={one.id === way} onClick={() => onWay(one.id)}>
                <span className={`num-logo num-logo-${one.via ?? one.id}`}>{LOGO[one.id] ?? one.name.slice(0, 2)}</span>
                <span>
                  <span className="num-choice-name">
                    {one.name} <span className={`num-how num-how-${one.how}`}>{HOW_SAID[one.how]}</span>
                  </span>
                  <span className="num-choice-says">{one.says}</span>
                </span>
              </button>
            ))}
          </div>
          {chosen !== null && <div className="num-section-label">2 · {chosen.name}</div>}
          {chosen?.id === "buy" && <BuyWay {...props} />}
          {chosen?.id === "twilio" && <TwilioWay {...props} />}
          {chosen?.via !== undefined && <GuidedWay {...props} way={chosen} key={chosen.id} />}
          {chosen?.id === "pbx" && <PbxWay {...props} />}
          {chosen?.id === "whatsapp" && <WhatsAppWay {...props} />}
        </div>
      </section>
    </>
  );
}
