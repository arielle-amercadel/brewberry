// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import App from "./App";
import { createCafeState, type CafeState } from "./data/cafeGame";
import { ingredients } from "./data/ingredients";
import { recipeIds, recipes } from "./data/recipes";
import { SAVE_KEY } from "./data/save";
import { installFakeLocks } from "./test-utils/fakeLocks";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function start() {
  render(<App />);
  return userEvent.setup();
}
/** A reload: the old page goes away and releases its lock, then a new one loads. */
async function refresh() {
  cleanup();
  await new Promise((resolve) => setTimeout(resolve, 0));
  render(<App />);
}

const button = (name: string) => screen.getByRole("button", { name });
const coins = () =>
  Number(within(screen.getByRole("banner")).getByText(/^\d+$/).textContent);
const statusBar = () =>
  screen.getByRole("list", { name: "Day and orders" }).textContent;
const footer = () => screen.getByRole("contentinfo").textContent;
const warning = () =>
  screen
    .queryAllByRole("alert")
    .find((alert) => alert.textContent?.includes("isn't being saved"));
const pause = (user: UserEvent) => user.pointer({ target: document.body });

const stored = () => JSON.parse(localStorage.getItem(SAVE_KEY)!);

const otherTab = (changes: Partial<CafeState>): CafeState => ({
  ...createCafeState({ customerId: "maple", recipeId: "honey-tea" }),
  ...changes,
});

async function serve(user: UserEvent) {
  const name = document.querySelector(".ticket-drink")?.textContent;
  const id = recipeIds.find((r) => recipes[r].name === name)!;
  for (const item of recipes[id].items) {
    await user.click(button(ingredients[item].name));
  }
  await pause(user);
  await user.click(button("Brew"));
  await pause(user);
}

const blockWrites = () =>
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("full", "QuotaExceededError");
  });

describe("an unexpected newer save, which only another tab could write", () => {
  test("stops this tab with the out-of-date screen instead of overwriting it", async () => {
    const user = start();
    await serve(user);
    const theirs = JSON.stringify({ version: 1, revision: stored().revision + 1, state: otherTab({ coins: 99 }) });
    localStorage.setItem(SAVE_KEY, theirs);
    await user.click(button("Next customer"));
    const title = screen.getByRole("heading", { name: "This tab is out of date" });
    expect(document.activeElement).toBe(title);
    expect(button("Reload")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Café counter" })).toBeNull();
    expect(localStorage.getItem(SAVE_KEY)).toBe(theirs);
  });
});

describe("without Web Locks", () => {
  const removeLocks = () => delete (navigator as { locks?: unknown }).locks;
  const savedGame = () =>
    JSON.stringify({ version: 1, revision: 4, state: otherTab({ coins: 85, day: 3 }) });

  test("the game plays, with a clear warning that nothing is saved", async () => {
    removeLocks();
    const user = start();
    const alert = screen
      .getAllByRole("alert")
      .find((a) => a.textContent?.includes("nothing is"));
    expect(alert?.textContent).toContain("Progress will be lost when you close this page");
    expect(footer()).toContain("isn't saved in this browser");
    await serve(user);
    expect(coins()).toBe(40);
  });

  test("the stored game is never read, so it isn't shown", () => {
    localStorage.setItem(SAVE_KEY, savedGame());
    removeLocks();
    const reads = vi.spyOn(Storage.prototype, "getItem");
    start();
    expect(coins()).toBe(30);
    expect(statusBar()).toContain("Day 1");
    expect(reads).not.toHaveBeenCalled();
  });

  test("two tabs playing can't touch the stored game", async () => {
    localStorage.setItem(SAVE_KEY, savedGame());
    removeLocks();
    vi.stubGlobal("confirm", () => true);
    const writes = vi.spyOn(Storage.prototype, "setItem");
    const removals = vi.spyOn(Storage.prototype, "removeItem");
    const user = userEvent.setup();
    const first = render(<App />);
    const second = render(<App />);
    for (const tab of [first.container, second.container]) {
      const t = within(tab);
      const name = tab.querySelector(".ticket-drink")?.textContent;
      const id = recipeIds.find((r) => recipes[r].name === name)!;
      for (const item of recipes[id].items) {
        await user.click(t.getByRole("button", { name: ingredients[item].name }));
      }
      await user.pointer({ target: document.body });
      await user.click(t.getByRole("button", { name: "Brew" }));
      await user.pointer({ target: document.body });
      await user.click(t.getByRole("button", { name: "Start over" }));
    }
    expect(writes).not.toHaveBeenCalled();
    expect(removals).not.toHaveBeenCalled();
    expect(localStorage.getItem(SAVE_KEY)).toBe(savedGame());
  });

  test("with no save yet, playing never creates one", async () => {
    // Nothing stored means no revision to conflict with, so only the fallback
    // itself stops this tab from writing.
    removeLocks();
    vi.stubGlobal("confirm", () => true);
    const reads = vi.spyOn(Storage.prototype, "getItem");
    const writes = vi.spyOn(Storage.prototype, "setItem");
    const removals = vi.spyOn(Storage.prototype, "removeItem");
    const user = start();
    await serve(user);
    await user.click(button("Next customer"));
    await user.click(button("Start over"));
    expect(reads).not.toHaveBeenCalled();
    expect(writes).not.toHaveBeenCalled();
    expect(removals).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
  });

  test("Start over resets the game in memory only", async () => {
    localStorage.setItem(SAVE_KEY, savedGame());
    removeLocks();
    vi.stubGlobal("confirm", () => true);
    const user = start();
    await serve(user);
    await user.click(button("Start over"));
    expect(coins()).toBe(30);
    expect(localStorage.getItem(SAVE_KEY)).toBe(savedGame());
  });

  test("once Web Locks is back, the untouched save loads normally", async () => {
    localStorage.setItem(SAVE_KEY, savedGame());
    removeLocks();
    const user = start();
    await serve(user);
    cleanup();
    installFakeLocks();
    render(<App />);
    expect(coins()).toBe(85);
    expect(statusBar()).toContain("Day 3");
  });
});

describe("saving that stops working", () => {
  test("shows a persistent warning, and stops claiming progress is saved", async () => {
    const user = start();
    expect(warning()).toBeUndefined();
    expect(footer()).toContain("Progress saves automatically");

    blockWrites();
    await serve(user);
    expect(coins()).toBe(40);
    expect(warning()).toBeTruthy();
    expect(within(warning()!).queryByRole("button")).toBeNull();
    expect(footer()).toContain("isn't being saved");
    expect(footer()).not.toContain("saves automatically");

    await user.click(button("Next customer"));
    expect(warning()).toBeTruthy();
  });

  test("a refresh after a failed save loads the last saved progress", async () => {
    const user = start();
    await serve(user);
    blockWrites();
    await user.click(button("Next customer"));
    vi.restoreAllMocks();
    await refresh();
    expect(coins()).toBe(40);
    expect(button("Next customer")).toBeTruthy();
  });

  test("the warning clears once saving works again", async () => {
    const user = start();
    const spy = blockWrites();
    await serve(user);
    expect(warning()).toBeTruthy();
    spy.mockRestore();
    await user.click(button("Next customer"));
    expect(warning()).toBeUndefined();
    expect(footer()).toContain("Progress saves automatically");
    await refresh();
    expect(coins()).toBe(40);
  });

  test("a valid save loads with writes blocked, with the warning", () => {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ version: 1, revision: 3, state: otherTab({ coins: 85, day: 4 }) }),
    );
    blockWrites();
    start();
    expect(coins()).toBe(85);
    expect(statusBar()).toContain("Day 4");
    expect(warning()).toBeTruthy();
    expect(screen.queryByText(/couldn't be opened/)).toBeNull();
  });

  test("progress made with writes blocked still plays", async () => {
    blockWrites();
    const user = start();
    expect(warning()).toBeTruthy();
    await serve(user);
    expect(coins()).toBe(40);
  });
});

describe("starting over when saving fails", () => {
  test("if the reset can't be written, the old save is removed so it can't come back", async () => {
    vi.stubGlobal("confirm", () => true);
    const user = start();
    await serve(user);
    blockWrites();
    await user.click(button("Start over"));
    expect(coins()).toBe(30);
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
    expect(warning()).toBeTruthy();
    vi.restoreAllMocks();
    await refresh();
    expect(coins()).toBe(30);
    expect(statusBar()).toContain("0/5");
  });

  test("if the old save can't be replaced or removed, nothing is reset and the player is told", async () => {
    vi.stubGlobal("confirm", () => true);
    const user = start();
    await serve(user);
    blockWrites();
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    await user.click(button("Start over"));
    expect(coins()).toBe(40);
    const alert = screen
      .getAllByRole("alert")
      .find((a) => a.textContent?.includes("Couldn't start over"));
    expect(alert).toBeTruthy();
    vi.restoreAllMocks();
    await refresh();
    expect(coins()).toBe(40);
  });
});

describe("a reset that can't be confirmed", () => {
  test("is refused when deletion can't be checked, so old progress can't come back later", async () => {
    vi.stubGlobal("confirm", () => true);
    const user = start();
    await serve(user);
    const before = localStorage.getItem(SAVE_KEY);
    // Storage stops working for a moment: nothing can be written, removed, or read.
    const fail = () => {
      throw new DOMException("unavailable", "SecurityError");
    };
    const spies = [
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(fail),
      vi.spyOn(Storage.prototype, "removeItem").mockImplementation(fail),
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(fail),
    ];
    await user.click(button("Start over"));
    expect(coins()).toBe(40);
    expect(
      screen.getAllByRole("alert").some((a) => a.textContent?.includes("Couldn't start over")),
    ).toBe(true);

    // Storage recovers. What loads matches what the player was told.
    for (const spy of spies) spy.mockRestore();
    await refresh();
    expect(coins()).toBe(40);
    expect(localStorage.getItem(SAVE_KEY)).toBe(before);
  });

  test("is refused when removal silently leaves the save behind", async () => {
    vi.stubGlobal("confirm", () => true);
    const user = start();
    await serve(user);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {});
    await user.click(button("Start over"));
    expect(coins()).toBe(40);
    vi.restoreAllMocks();
    await refresh();
    expect(coins()).toBe(40);
  });
});
