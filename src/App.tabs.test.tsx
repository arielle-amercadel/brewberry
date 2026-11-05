// @vitest-environment jsdom
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import App from "./App";
import { ingredients } from "./data/ingredients";
import { recipeIds, recipes } from "./data/recipes";
import { SAVE_KEY } from "./data/save";
import { installFakeLocks } from "./test-utils/fakeLocks";

let locks: ReturnType<typeof installFakeLocks>;
beforeEach(() => {
  locks = installFakeLocks();
});
afterEach(() => {
  cleanup();
  locks.uninstall();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Opens Brewberry in another "tab": a second copy of the app in the page. */
function openTab() {
  const { container, unmount } = render(<App />);
  const tab = within(container);
  return {
    tab,
    close: unmount,
    button: (name: string) => tab.getByRole("button", { name }),
    coins: () =>
      Number(within(tab.getByRole("banner")).getByText(/^\d+$/).textContent),
    isPlaying: () => tab.queryByRole("region", { name: "Café counter" }) !== null,
    hasNotice: (text: string) => tab.queryByRole("heading", { name: text }) !== null,
  };
}
type Tab = ReturnType<typeof openTab>;

const untilPlaying = (t: Tab) => waitFor(() => expect(t.isPlaying()).toBe(true));
const untilNotice = (t: Tab, text: string) =>
  waitFor(() => expect(t.hasNotice(text)).toBe(true));

async function serve(t: Tab, user: UserEvent) {
  const name = t.tab.getByText((_, el) => el?.classList.contains("ticket-drink") ?? false).textContent;
  const id = recipeIds.find((r) => recipes[r].name === name)!;
  for (const item of recipes[id].items) {
    await user.click(t.button(ingredients[item].name));
  }
  await user.pointer({ target: document.body });
  await user.click(t.button("Brew"));
  await user.pointer({ target: document.body });
}

const WAITING = "Brewberry is open in another tab";
const HANDED_OFF = "You're now playing in another tab";

describe("one active tab", () => {
  test("the first tab plays, and a second one waits without the game", async () => {
    const a = openTab();
    await untilPlaying(a);
    const b = openTab();
    await untilNotice(b, WAITING);
    expect(b.isPlaying()).toBe(false);
    expect(b.tab.queryByRole("region", { name: "Prep station" })).toBeNull();
    expect(b.tab.queryByRole("navigation")).toBeNull();
    expect(b.tab.queryByRole("button", { name: "Start over" })).toBeNull();
    expect(b.button("Play here instead")).toBeTruthy();
  });

  test("tabs opened at the same moment get exactly one player", async () => {
    const tabs = [openTab(), openTab(), openTab()];
    await waitFor(() =>
      expect(tabs.filter((t) => t.isPlaying() || t.hasNotice(WAITING))).toHaveLength(3),
    );
    expect(tabs.filter((t) => t.isPlaying())).toHaveLength(1);
  });

  test("a waiting tab doesn't read the save until it holds the lock", async () => {
    const a = openTab();
    await untilPlaying(a);
    const reads = vi.spyOn(Storage.prototype, "getItem");
    const b = openTab();
    await untilNotice(b, WAITING);
    expect(reads.mock.calls.filter(([key]) => key === SAVE_KEY)).toHaveLength(0);
  });

  test("closing the active tab opens the café in a waiting one, with the latest progress", async () => {
    const user = userEvent.setup();
    const a = openTab();
    await untilPlaying(a);
    const b = openTab();
    await untilNotice(b, WAITING);
    await serve(a, user);
    expect(a.coins()).toBe(40);
    a.close();
    await untilPlaying(b);
    expect(b.coins()).toBe(40);
    expect(b.button("Next customer")).toBeTruthy();
  });

  test("Play here instead pauses the other tab first, then opens here", async () => {
    const user = userEvent.setup();
    const a = openTab();
    await untilPlaying(a);
    await serve(a, user);
    const b = openTab();
    await untilNotice(b, WAITING);
    await user.click(b.button("Play here instead"));
    await untilPlaying(b);
    expect(a.hasNotice(HANDED_OFF)).toBe(true);
    expect(a.isPlaying()).toBe(false);
    expect(b.coins()).toBe(40);
    expect(document.activeElement?.textContent).toBe("Welcome to the café");

    // The paused tab can take back over, with nothing lost or duplicated.
    await user.click(b.button("Next customer"));
    await serve(b, user);
    await user.click(a.button("Play here instead"));
    await untilPlaying(a);
    expect(a.coins()).toBe(50);
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).state.coins).toBe(50);
  });

  test("the tab that asked opens, even when another has waited longer", async () => {
    const user = userEvent.setup();
    const a = openTab();
    await untilPlaying(a);
    const c = openTab();
    await untilNotice(c, WAITING);
    const b = openTab();
    await untilNotice(b, WAITING);
    await user.click(b.button("Play here instead"));
    await untilPlaying(b);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(c.isPlaying()).toBe(false);
    expect(a.isPlaying()).toBe(false);
  });

  test("a reset isn't undone when a waiting tab takes over", async () => {
    vi.stubGlobal("confirm", () => true);
    const user = userEvent.setup();
    const a = openTab();
    await untilPlaying(a);
    const b = openTab();
    await untilNotice(b, WAITING);
    await serve(a, user);
    await user.click(a.button("Start over"));
    expect(a.coins()).toBe(30);
    a.close();
    await untilPlaying(b);
    expect(b.coins()).toBe(30);
    expect(b.tab.getByRole("list", { name: "Day and orders" }).textContent).toContain("0/5");
  });

  test("a frozen tab that doesn't answer is never doubled up on", async () => {
    const release = locks.holdAsFrozenTab("brewberry-game");
    const user = userEvent.setup();
    const b = openTab();
    await untilNotice(b, WAITING);
    await user.click(b.button("Play here instead"));
    expect(b.tab.getByRole("status").textContent).toContain("Asking the other tab");
    await new Promise((resolve) => setTimeout(resolve, 3100));
    expect(b.tab.getByRole("status").textContent).toContain("isn't responding");
    expect(b.isPlaying()).toBe(false);
    release();
    await untilPlaying(b);
  }, 10000);

  test("a failed save at startup shows the warning", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    const a = openTab();
    await untilPlaying(a);
    expect(a.tab.getByRole("alert").textContent).toContain("isn't being saved");
    expect(a.tab.getByRole("contentinfo").textContent).toContain("isn't being saved");
  });

  test("development double-mounting ends with one holder and nothing queued", async () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "Café counter" })).not.toBeNull(),
    );
    expect(locks.isHeld("brewberry-game")).toBe(true);
    expect(locks.waitingCount("brewberry-game")).toBe(0);
  });
});

describe("page headings", () => {
  const mainHeadings = (t: Tab) => t.tab.queryAllByRole("heading", { level: 1 });

  test("every screen has exactly one main heading, playing or not", async () => {
    const user = userEvent.setup();
    const a = openTab();
    await untilPlaying(a);
    expect(mainHeadings(a).map((h) => h.textContent)).toEqual(["Brewberry"]);

    const b = openTab();
    await untilNotice(b, WAITING);
    expect(mainHeadings(b).map((h) => h.textContent)).toEqual(["Brewberry"]);

    await user.click(b.button("Play here instead"));
    await untilPlaying(b);
    await untilNotice(a, HANDED_OFF);
    expect(mainHeadings(a).map((h) => h.textContent)).toEqual(["Brewberry"]);
    expect(mainHeadings(b).map((h) => h.textContent)).toEqual(["Brewberry"]);
  });

  test("the notice's own heading still takes focus, below the main heading", async () => {
    locks.failRequests("brewberry-game");
    const a = openTab();
    await untilNotice(a, "Brewberry couldn't open your café");
    expect(document.activeElement).toBe(
      a.tab.getByRole("heading", { level: 2, name: "Brewberry couldn't open your café" }),
    );
    expect(mainHeadings(a)).toHaveLength(1);
  });
});

describe("when the browser's tab locks fail", () => {
  const FAILED = "Brewberry couldn't open your café";

  test("at startup, an error screen with Reload replaces the endless loading screen", async () => {
    localStorage.setItem(SAVE_KEY, "saved progress");
    locks.failRequests("brewberry-game");
    const reads = vi.spyOn(Storage.prototype, "getItem");
    const writes = vi.spyOn(Storage.prototype, "setItem");
    const a = openTab();
    await untilNotice(a, FAILED);
    expect(document.activeElement).toBe(a.tab.getByRole("heading", { name: FAILED }));
    expect(a.button("Reload")).toBeTruthy();
    expect(a.isPlaying()).toBe(false);
    expect(a.tab.queryByRole("button", { name: "Start over" })).toBeNull();
    expect(a.tab.queryByRole("button", { name: "Play here instead" })).toBeNull();
    expect(reads).not.toHaveBeenCalled();
    expect(writes).not.toHaveBeenCalled();
    expect(localStorage.getItem(SAVE_KEY)).toBe("saved progress");
  });

  test("while waiting, the waiting tab shows the error and never opens or saves", async () => {
    const user = userEvent.setup();
    const a = openTab();
    await untilPlaying(a);
    await serve(a, user);
    const b = openTab();
    await untilNotice(b, WAITING);
    locks.failQuery();
    a.close();
    await untilNotice(b, FAILED);
    const saved = localStorage.getItem(SAVE_KEY);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(b.isPlaying()).toBe(false);
    expect(localStorage.getItem(SAVE_KEY)).toBe(saved);
    expect(locks.isHeld("brewberry-game")).toBe(false);
  });

  test("asking to play here fails safely: the other tab keeps playing", async () => {
    const user = userEvent.setup();
    const a = openTab();
    await untilPlaying(a);
    const b = openTab();
    await untilNotice(b, WAITING);
    locks.failRequests("brewberry-handoff");
    await user.click(b.button("Play here instead"));
    await untilNotice(b, FAILED);
    expect(b.tab.queryByRole("status")).toBeNull();
    expect(a.isPlaying()).toBe(true);
    await serve(a, user);
    expect(a.coins()).toBe(40);
    expect(locks.waitingCount("brewberry-game")).toBe(0);
  });
});
