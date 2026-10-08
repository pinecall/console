/** A titled part of a case's document, with the sentence that says what it is for. */

import type { ReactNode } from "react";

export function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }): ReactNode {
  return (
    <section className="cs-sec">
      <h2 className="cs-sec-title">{title}</h2>
      <p className="cs-sec-hint">{hint}</p>
      {children}
    </section>
  );
}
