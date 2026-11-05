// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Navigation } from "./Navigation";

// jsdom has no layout, so each test places the control and the sticky tabs
// itself. Its :focus-visible is also unreliable, so each test says whether the
// focus counts as keyboard focus. Real keyboard and mouse focus, on the actual
// recipe cards, are checked in Firefox and Chromium.
const TABS_TOP = 546;
const scrolled = vi.fn();

beforeEach(() => {
  Element.prototype.scrollIntoView = scrolled;
});
afterEach(() => {
  cleanup();
  scrolled.mockReset();
  vi.restoreAllMocks();
  delete (Element.prototype as Partial<Element>).scrollIntoView;
});

/** A focusable control above the tabs, whose bottom edge sits at `bottom`. */
function setup(bottom: number, { keyboard = true } = {}) {
  render(
    <>
      <button type="button">Café latte</button>
      <Navigation view="Recipe Book" onNavigate={() => {}} />
    </>,
  );
  const card = screen.getByRole("button", { name: "Café latte" });
  const nav = screen.getByRole("navigation");
  vi.spyOn(card, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, bottom - 192, 140, 192),
  );
  vi.spyOn(nav, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, TABS_TOP, 320, 94),
  );
  const matches = card.matches.bind(card);
  vi.spyOn(card, "matches").mockImplementation((selector) =>
    selector === ":focus-visible" ? keyboard : matches(selector),
  );
  return { card, user: userEvent.setup() };
}
/** The check runs on the next frame, after the browser's own scrolling. */
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

// Measured in Firefox at 320px: Recipe Book card 3 ends at 553, under tabs at 546.
test("a card focused by keyboard under the tabs is scrolled clear of them", async () => {
  const { card, user } = setup(553);
  await user.tab();
  await nextFrame();
  expect(document.activeElement).toBe(card);
  expect(scrolled).toHaveBeenCalledTimes(1);
  expect(scrolled).toHaveBeenCalledWith({ block: "nearest" });
  expect(scrolled.mock.contexts[0]).toBe(card);
});

test("its focus ring counts too, even when the card itself just clears the tabs", async () => {
  const { user } = setup(TABS_TOP - 4);
  await user.tab();
  await nextFrame();
  expect(scrolled).toHaveBeenCalledTimes(1);
});

test("a card already clear of the tabs, ring and all, isn't moved", async () => {
  const { user } = setup(TABS_TOP - 20);
  await user.tab();
  await nextFrame();
  expect(scrolled).not.toHaveBeenCalled();
});

test("clicking or tapping a card doesn't move the page", async () => {
  const { card, user } = setup(553, { keyboard: false });
  await user.click(card);
  await nextFrame();
  expect(document.activeElement).toBe(card);
  expect(scrolled).not.toHaveBeenCalled();
});

test("focusing the tabs themselves never scrolls", async () => {
  const { user } = setup(TABS_TOP - 20);
  const tab = screen.getByRole("button", { name: "Café" });
  vi.spyOn(tab, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, TABS_TOP + 4, 100, 80),
  );
  await user.tab();
  await user.tab();
  await nextFrame();
  expect(document.activeElement).toBe(tab);
  expect(scrolled).not.toHaveBeenCalled();
});
