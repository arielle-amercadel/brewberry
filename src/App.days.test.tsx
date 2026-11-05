// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import App from "./App";
import { createCafeState } from "./data/cafeGame";
import { ingredients } from "./data/ingredients";
import { recipeIds, recipes } from "./data/recipes";
import { BACKUP_KEY, SAVE_KEY } from "./data/save";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function start() {
  render(<App />);
  return userEvent.setup();
}
/** What a browser refresh does: the page goes away and loads from storage. */
/** A reload: the old page goes away and releases its lock, then a new one loads. */
async function refresh() {
  cleanup();
  await new Promise((resolve) => setTimeout(resolve, 0));
  render(<App />);
}

const button = (name: string) => screen.getByRole("button", { name });
const queryButton = (name: string) => screen.queryByRole("button", { name });
const heading = (name: string) => screen.getByRole("heading", { name });
const coins = () =>
  Number(within(screen.getByRole("banner")).getByText(/^\d+$/).textContent);
const statusBar = () =>
  screen.getByRole("list", { name: "Day and orders" }).textContent;
const drinkName = () => document.querySelector(".ticket-drink")?.textContent;
const atCounter = () =>
  (document.querySelector(".customer img[alt]") as HTMLImageElement).alt;
const filledPips = () =>
  [...document.querySelectorAll("header img")].filter((img) =>
    (img as HTMLImageElement).src.includes("pip-full"),
  ).length;
const pause = (user: UserEvent) => user.pointer({ target: document.body });

const currentRecipe = () =>
  recipes[recipeIds.find((id) => recipes[id].name === drinkName())!];
const itemNames = () =>
  currentRecipe().items.map((id) => ingredients[id].name);

async function serve(user: UserEvent) {
  for (const name of itemNames()) await user.click(button(name));
  await pause(user);
  await user.click(button("Brew"));
  await pause(user);
}
async function serveAndMoveOn(user: UserEvent, times: number) {
  for (let i = 0; i < times; i++) {
    await serve(user);
    await user.click(button("Next customer"));
    await pause(user);
  }
}
async function reachDayComplete(user: UserEvent) {
  await serveAndMoveOn(user, 4);
  await serve(user);
  await user.click(button("Finish Day"));
  await pause(user);
}
const savedState = () => JSON.parse(localStorage.getItem(SAVE_KEY)!).state;

describe("the status bar", () => {
  test("starts at Day 1 with 0/5 orders and no filled pips", () => {
    start();
    expect(statusBar()).toContain("Day 1");
    expect(statusBar()).toContain("0/5");
    expect(filledPips()).toBe(0);
  });

  test("counts correct drinks only", async () => {
    const user = start();
    const wrong = Object.values(ingredients)
      .map((item) => item.name)
      .filter((name) => !itemNames().includes(name))
      .slice(0, 2);
    for (const name of wrong) await user.click(button(name));
    await pause(user);
    await user.click(button("Brew"));
    expect(statusBar()).toContain("0/5");
    await user.click(button("Clear"));
    await serve(user);
    expect(statusBar()).toContain("1/5");
    expect(filledPips()).toBe(1);
  });

  test("order numbers follow the day", async () => {
    const user = start();
    expect(heading("Order #01")).toBeTruthy();
    await serve(user);
    expect(heading("Order #01")).toBeTruthy();
    await user.click(button("Next customer"));
    expect(heading("Order #02")).toBeTruthy();
  });
});

describe("finishing a day", () => {
  test("orders one to four offer the next customer, and the fifth finishes the day", async () => {
    const user = start();
    await serveAndMoveOn(user, 4);
    expect(statusBar()).toContain("4/5");
    expect(heading("Order #05")).toBeTruthy();
    await serve(user);
    expect(statusBar()).toContain("5/5");
    expect(filledPips()).toBe(5);
    expect(queryButton("Next customer")).toBeNull();
    expect(button("Finish Day")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "That's everyone for today!",
    );
  });

  test("Day Complete shows the day's numbers and takes focus", async () => {
    const user = start();
    await reachDayComplete(user);
    const title = heading("Day 1 Complete!");
    expect(document.activeElement).toBe(title);
    const receipt = screen.getByRole("region", { name: "Today's receipt" });
    expect(within(receipt).getByText("Customers served").nextSibling?.textContent).toBe("5");
    expect(within(receipt).getByText("Coins earned today").nextSibling?.textContent).toBe("+50");
    expect(within(receipt).getByText("Total coins").nextSibling?.textContent).toBe("80");
    for (const name of ["Mochi the bunny", "Biscuit the cat", "Maple the bear", "Matcha the frog"]) {
      expect(screen.getByAltText(name)).toBeTruthy();
    }
    expect(screen.queryByRole("region", { name: "Prep station" })).toBeNull();
  });

  test("the receipt's total reflects shopping, but today's earnings don't change", async () => {
    const user = start();
    await reachDayComplete(user);
    await user.click(button("Shop"));
    await user.click(button("Buy Berry bunting"));
    await pause(user);
    await user.click(button("Café"));
    const receipt = screen.getByRole("region", { name: "Today's receipt" });
    expect(within(receipt).getByText("Coins earned today").nextSibling?.textContent).toBe("+50");
    expect(within(receipt).getByText("Total coins").nextSibling?.textContent).toBe("65");
  });

  test("Shop and Recipe Book stay open during Day Complete", async () => {
    const user = start();
    await reachDayComplete(user);
    await user.click(button("Recipe Book"));
    expect(heading("Your recipe book")).toBeTruthy();
    await user.click(button("Shop"));
    expect(heading("The cozy shop")).toBeTruthy();
    await user.click(button("Café"));
    expect(heading("Day 1 Complete!")).toBeTruthy();
  });

  test("double-clicking Finish Day doesn't also start the next day", async () => {
    const user = start();
    await serveAndMoveOn(user, 4);
    await serve(user);
    await user.dblClick(button("Finish Day"));
    expect(heading("Day 1 Complete!")).toBeTruthy();
    expect(statusBar()).toContain("Day 1");
  });

  test("double-clicking Brew on the fifth order doesn't skip the thank-you", async () => {
    const user = start();
    await serveAndMoveOn(user, 4);
    for (const name of itemNames()) await user.click(button(name));
    await pause(user);
    await user.dblClick(button("Brew"));
    expect(button("Finish Day")).toBeTruthy();
    expect(coins()).toBe(80);
  });

  test("Enter twice on Finish Day doesn't start the next day", async () => {
    const user = start();
    await serveAndMoveOn(user, 4);
    await serve(user);
    // Long enough that the first press isn't taken as a repeat of Brew.
    await new Promise((resolve) => setTimeout(resolve, 550));
    button("Finish Day").focus();
    await user.keyboard("{Enter}{Enter}");
    expect(heading("Day 1 Complete!")).toBeTruthy();
  });
});

describe("decorations on Day Complete", () => {
  const closedCafe = () => screen.getByRole("region", { name: "The café after closing" });
  const shown = () =>
    within(closedCafe())
      .getAllByRole("img")
      .map((img) => img.getAttribute("alt") ?? img.getAttribute("aria-label"))
      .filter((name) => !name?.includes(" the "));
  const save = (equipped: string[]) => {
    const state = {
      ...createCafeState({ customerId: "mochi", recipeId: "strawberry-milk" }),
      servedToday: 5,
      dayComplete: true,
      feedback: "correct",
      selected: ["milk", "strawberry"],
      coins: 100,
      owned: ["strawberry-planter", "sage-rug", "sunny-print", "cafe-lamp", "bunting", "cozy-cushion"],
      equipped,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, revision: 1, state }));
  };

  test("every equipped decoration is in the closed café", () => {
    save(["strawberry-planter", "sage-rug", "sunny-print", "cafe-lamp", "bunting", "cozy-cushion"]);
    start();
    expect(shown().sort()).toEqual(
      ["Berry bunting", "Café lamp", "Cozy cushion", "Sage checkered rug", "Strawberry planter", "Sunny wall print"],
    );
  });

  test("decorations put away in the Shop stay out of it", () => {
    save(["bunting", "sage-rug"]);
    start();
    expect(shown().sort()).toEqual(["Berry bunting", "Sage checkered rug"]);
  });

  test("with nothing equipped, only the guests are there", () => {
    save([]);
    start();
    expect(shown()).toEqual([]);
    expect(within(closedCafe()).getAllByRole("img")).toHaveLength(4);
  });

  test("something bought and put out today shows when the day ends", async () => {
    const user = start();
    await user.click(button("Shop"));
    await user.click(button("Buy Berry bunting"));
    await user.click(button("Café"));
    await reachDayComplete(user);
    expect(shown()).toEqual(["Berry bunting"]);
  });
});

describe("starting the next day", () => {
  test("advances the day, resets orders, and carries everything over", async () => {
    const user = start();
    await user.click(button("Shop"));
    await user.click(button("Buy Berry bunting"));
    await pause(user);
    await user.click(button("Café"));
    await reachDayComplete(user);
    await user.click(button("Start Next Day"));

    expect(statusBar()).toContain("Day 2");
    expect(statusBar()).toContain("0/5");
    expect(filledPips()).toBe(0);
    expect(heading("Order #01")).toBeTruthy();
    expect(coins()).toBe(65);
    expect(queryButton("Next customer")).toBeNull();
    expect(screen.getByRole("img", { name: "Berry bunting" })).toBeTruthy();
    await user.click(button("Shop"));
    expect(button("Unequip Berry bunting")).toBeTruthy();
  });

  test("a different customer opens the new day", async () => {
    const user = start();
    await serveAndMoveOn(user, 4);
    await serve(user);
    const last = atCounter();
    await user.click(button("Finish Day"));
    await pause(user);
    await user.click(button("Start Next Day"));
    expect(atCounter()).not.toBe(last);
  });

  test("focus and the day number reach keyboard and screen reader players", async () => {
    const user = start();
    await reachDayComplete(user);
    button("Start Next Day").focus();
    await user.keyboard("{Enter}");
    const title = heading("Welcome to the café, Day 2");
    expect(document.activeElement).toBe(title);
    await user.tab();
    expect(document.activeElement).toBe(button("Milk"));
  });

  test("double-clicking Start Next Day only advances once", async () => {
    const user = start();
    await reachDayComplete(user);
    await user.dblClick(button("Start Next Day"));
    expect(statusBar()).toContain("Day 2");
  });

  test("several days can be played in a row", async () => {
    const user = start();
    for (const day of [1, 2, 3]) {
      expect(statusBar()).toContain(`Day ${day}`);
      await reachDayComplete(user);
      await user.click(button("Start Next Day"));
      await pause(user);
    }
    expect(statusBar()).toContain("Day 4");
    expect(coins()).toBe(30 + 3 * 50);
  });
});

describe("refreshing", () => {
  test("mid-order keeps the customer, drink, selection, and coins", async () => {
    const user = start();
    const customer = atCounter();
    const drink = drinkName();
    await user.click(button(itemNames()[0]));
    await refresh();
    expect(atCounter()).toBe(customer);
    expect(drinkName()).toBe(drink);
    expect(button(itemNames()[0]).getAttribute("aria-pressed")).toBe("true");
    expect(button(`Remove ${itemNames()[0]}`)).toBeTruthy();
    expect(coins()).toBe(30);
  });

  test("the order can be finished after refreshing, paying once", async () => {
    const user = start();
    const [first, second] = itemNames();
    await user.click(button(first));
    await refresh();
    await user.click(button(second));
    await pause(user);
    await user.click(button("Brew"));
    expect(coins()).toBe(40);
    expect(statusBar()).toContain("1/5");
  });

  test("a wrong drink's message survives without any cost", async () => {
    const user = start();
    const wrong = Object.values(ingredients)
      .map((item) => item.name)
      .filter((name) => !itemNames().includes(name))
      .slice(0, 2);
    for (const name of wrong) await user.click(button(name));
    await pause(user);
    await user.click(button("Brew"));
    await refresh();
    expect(screen.getByRole("status").textContent).toContain("not quite");
    expect(coins()).toBe(30);
  });

  test("after a correct drink doesn't pay or count again", async () => {
    const user = start();
    await serve(user);
    const served = savedState();
    for (let i = 0; i < 3; i++) await refresh();
    expect(coins()).toBe(40);
    expect(statusBar()).toContain("1/5");
    expect(button("Next customer")).toBeTruthy();
    expect(queryButton("Brew")).toBeNull();
    expect(savedState()).toEqual(served);
    await user.click(button("Next customer"));
    expect(coins()).toBe(40);
    expect(heading("Order #02")).toBeTruthy();
  });

  test("after buying doesn't charge again or allow a second purchase", async () => {
    const user = start();
    await user.click(button("Shop"));
    await user.click(button("Buy Berry bunting"));
    await refresh();
    expect(coins()).toBe(15);
    expect(screen.getByRole("img", { name: "Berry bunting" })).toBeTruthy();
    await user.click(button("Shop"));
    expect(queryButton("Buy Berry bunting")).toBeNull();
    expect(button("Unequip Berry bunting")).toBeTruthy();
  });

  test("an unequipped item stays put away", async () => {
    const user = start();
    await user.click(button("Shop"));
    await user.click(button("Buy Berry bunting"));
    await pause(user);
    await user.click(button("Unequip Berry bunting"));
    await refresh();
    expect(screen.queryByRole("img", { name: "Berry bunting" })).toBeNull();
    await user.click(button("Shop"));
    expect(button("Equip Berry bunting")).toBeTruthy();
  });

  test("on the fifth thank-you still offers Finish Day", async () => {
    const user = start();
    await serveAndMoveOn(user, 4);
    await serve(user);
    await refresh();
    expect(button("Finish Day")).toBeTruthy();
    expect(coins()).toBe(80);
  });

  test("on Day Complete stays there with the same numbers", async () => {
    const user = start();
    await reachDayComplete(user);
    await refresh();
    await refresh();
    expect(heading("Day 1 Complete!")).toBeTruthy();
    expect(coins()).toBe(80);
    expect(statusBar()).toContain("5/5");
    await user.click(button("Start Next Day"));
    expect(statusBar()).toContain("Day 2");
    expect(coins()).toBe(80);
  });

  test("on a later day keeps the day", async () => {
    const user = start();
    await reachDayComplete(user);
    await user.click(button("Start Next Day"));
    await pause(user);
    await serve(user);
    await refresh();
    expect(statusBar()).toContain("Day 2");
    expect(statusBar()).toContain("1/5");
    expect(heading("Welcome to the café, Day 2")).toBeTruthy();
  });

  test("always opens the Café", async () => {
    const user = start();
    await user.click(button("Shop"));
    await refresh();
    expect(button("Café").getAttribute("aria-current")).toBe("page");
  });
});

describe("saves that can't be used", () => {
  test("a corrupted save shows a friendly message and starts a new game", async () => {
    localStorage.setItem(SAVE_KEY, "{not json");
    const user = start();
    expect(screen.getByRole("alert").textContent).toContain(
      "couldn't be opened",
    );
    expect(statusBar()).toContain("Day 1");
    expect(coins()).toBe(30);
    expect(localStorage.getItem(BACKUP_KEY)).toBe("{not json");

    await user.click(button("OK"));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(document.activeElement).toBe(heading("Welcome to the café"));
  });

  test("the message only appears once, and the new game saves when played", async () => {
    localStorage.setItem(SAVE_KEY, "{not json");
    start();
    await refresh();
    expect(screen.queryByRole("alert")).toBeNull();
    const user = userEvent.setup();
    await serve(user);
    expect(savedState().day).toBe(1);
    expect(savedState().coins).toBe(40);
  });

  test("an outdated save is treated the same way", () => {
    const old = JSON.stringify({ version: 99, state: createCafeState({ customerId: "mochi", recipeId: "honey-tea" }) });
    localStorage.setItem(SAVE_KEY, old);
    start();
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(localStorage.getItem(BACKUP_KEY)).toBe(old);
  });
});

describe("starting over", () => {
  const confirmWith = (answer: boolean) => {
    const confirm = vi.fn(() => answer);
    vi.stubGlobal("confirm", confirm);
    return confirm;
  };

  test("declining changes nothing", async () => {
    const confirm = confirmWith(false);
    const user = start();
    await serve(user);
    await user.click(button("Start over"));
    expect(confirm).toHaveBeenCalledOnce();
    expect(coins()).toBe(40);
    expect(statusBar()).toContain("1/5");
  });

  test("accepting resets everything, and stays reset after refreshing", async () => {
    confirmWith(true);
    const user = start();
    await user.click(button("Shop"));
    await user.click(button("Buy Berry bunting"));
    await pause(user);
    await user.click(button("Café"));
    await reachDayComplete(user);
    await user.click(button("Start Next Day"));
    await pause(user);
    await serve(user);
    await user.click(button("Shop"));
    await user.click(button("Start over"));

    const check = () => {
      expect(button("Café").getAttribute("aria-current")).toBe("page");
      expect(statusBar()).toContain("Day 1");
      expect(statusBar()).toContain("0/5");
      expect(coins()).toBe(30);
      expect(screen.queryByRole("img", { name: "Berry bunting" })).toBeNull();
    };
    check();
    expect(document.activeElement).toBe(heading("Welcome to the café"));
    await refresh();
    check();
    await user.click(button("Shop"));
    expect(button("Buy Berry bunting")).toBeTruthy();
  });

  test("works from Day Complete", async () => {
    confirmWith(true);
    const user = start();
    await reachDayComplete(user);
    await user.click(button("Start over"));
    expect(heading("Welcome to the café")).toBeTruthy();
    expect(coins()).toBe(30);
  });
});

describe("old labels", () => {
  test("no Preview labels remain, and the footer mentions saving", async () => {
    const user = start();
    expect(screen.queryByText("Preview")).toBeNull();
    await user.click(button("Recipe Book"));
    expect(screen.queryByText("Preview")).toBeNull();
    expect(screen.getByRole("contentinfo").textContent).toContain(
      "Progress saves automatically",
    );
  });
});
