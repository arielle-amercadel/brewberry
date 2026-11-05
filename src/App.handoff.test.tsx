// @vitest-environment jsdom
import { act, cleanup, render, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps, Dispatch } from "react";
import { afterEach, expect, test, vi } from "vitest";
import App from "./App";
import type { CafeAction } from "./data/cafeGame";
import { SAVE_KEY } from "./data/save";

// Keeps a reference to the dispatch the Café was given, as a stale callback would.
const captured: Dispatch<CafeAction>[] = [];
vi.mock("./views/CafeView", async (load) => {
  const actual = await load<typeof import("./views/CafeView")>();
  return {
    CafeView: (props: ComponentProps<typeof actual.CafeView>) => {
      captured.push(props.dispatch);
      return actual.CafeView(props);
    },
  };
});

afterEach(() => {
  cleanup();
  captured.length = 0;
  vi.restoreAllMocks();
});

test("a dispatch kept from before a handoff can't write or change the game", async () => {
  const user = userEvent.setup();
  const a = render(<App />);
  const tabA = within(a.container);
  await waitFor(() => expect(tabA.getByRole("region", { name: "Café counter" })).toBeTruthy());
  const stale = captured.at(-1)!;

  const b = render(<App />);
  const tabB = within(b.container);
  await waitFor(() => expect(tabB.getByRole("button", { name: "Play here instead" })).toBeTruthy());
  await user.click(tabB.getByRole("button", { name: "Play here instead" }));
  await waitFor(() => expect(tabB.getByRole("region", { name: "Café counter" })).toBeTruthy());
  expect(tabA.getByRole("heading", { name: "You're now playing in another tab" })).toBeTruthy();

  const savedBefore = localStorage.getItem(SAVE_KEY);
  const pressedBefore = tabB.getByRole("button", { name: "Milk" }).getAttribute("aria-pressed");
  const writes = vi.spyOn(Storage.prototype, "setItem");

  act(() => {
    stale({ type: "toggle", ingredientId: "milk" });
    stale({ type: "startOver", order: { customerId: "maple", recipeId: "honey-tea" } });
  });

  expect(writes).not.toHaveBeenCalled();
  expect(localStorage.getItem(SAVE_KEY)).toBe(savedBefore);
  expect(tabB.getByRole("button", { name: "Milk" }).getAttribute("aria-pressed")).toBe(pressedBefore);
  expect(tabA.queryByRole("region", { name: "Café counter" })).toBeNull();
  expect(tabA.getByRole("heading", { name: "You're now playing in another tab" })).toBeTruthy();
});
