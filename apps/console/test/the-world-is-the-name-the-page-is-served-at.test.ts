/** The world is the name the page was served at; the other world is the same screen at the other name. */

import { expect, test } from "vitest";

import { crossing, elsewhere, WORLD } from "../src/lib/mode";

test("a page nobody marked is production's, with no other name to go to", () => {
  expect(WORLD).toBe("production");
  expect(elsewhere()).toBeNull();
});

test("crossing keeps the screen and carries the one-use code that signs the other name in", () => {
  expect(crossing("https://sandbox.pinecall.io", "/a/clinica-norte/talk", "lc_9f2")).toBe(
    "https://sandbox.pinecall.io/a/clinica-norte/talk?login=lc_9f2",
  );
});

test("crossing with no code lands on the other name's own sign-in card", () => {
  expect(crossing("https://box.pinecall.io", "/calls", null)).toBe("https://box.pinecall.io/calls");
});
