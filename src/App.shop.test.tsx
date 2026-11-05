// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import App from "./App";
import { decorationIds, decorations } from "./data/decorations";
import { ingredients } from "./data/ingredients";
import { recipeIds, recipes } from "./data/recipes";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const coins = () =>
  Number(
    within(screen.getByRole("banner")).getByText(/^\d+$/).textContent,
  );
const button = (name: string) => screen.getByRole("button", { name });
const queryButton = (name: string) => screen.queryByRole("button", { name });
const isDisabled = (name: string) =>
  (button(name) as HTMLButtonElement).disabled;
const scene = () => screen.getByRole("region", { name: "Café counter" });
const tag = (name: string) =>
  screen.getByRole("heading", { name }).closest("li") as HTMLElement;
const speech = () => screen.getByRole("status").textContent;

/** Moves the pointer away, so the next click isn't part of a double-click. */
const pause = (user: UserEvent) => user.pointer({ target: document.body });
const go = async (user: UserEvent, tab: string) => {
  await user.click(button(tab));
  await pause(user);
};

async function serveDrink(user: UserEvent) {
  const name = document.querySelector(".ticket-drink")?.textContent;
  const id = recipeIds.find((r) => recipes[r].name === name)!;
  for (const item of recipes[id].items) {
    await user.click(button(ingredients[item].name));
  }
  await pause(user);
  await user.click(button("Brew"));
  await pause(user);
}

async function serveAndMoveOn(user: UserEvent, times: number) {
  for (let i = 0; i < times; i++) {
    await serveDrink(user);
    if (queryButton("Finish Day")) {
      await user.click(button("Finish Day"));
      await pause(user);
      await user.click(button("Start Next Day"));
    } else {
      await user.click(button("Next customer"));
    }
    await pause(user);
  }
}

function start() {
  render(<App />);
  return userEvent.setup();
}

test("the status bar starts at 30 coins, Day 1, and 0/5 orders, with no Preview tag", () => {
  start();
  expect(coins()).toBe(30);
  const group = screen.getByRole("list", { name: "Day and orders" });
  expect(within(group).getByText("Day 1")).toBeTruthy();
  expect(within(group).getByText("0/5")).toBeTruthy();
  expect(screen.queryByText("Preview")).toBeNull();
});

test("a correct drink adds 10 coins once, and the balance shows on every tab", async () => {
  const user = start();
  await serveDrink(user);
  expect(coins()).toBe(40);
  expect(screen.getByRole("status").textContent).toContain("+10 coins");

  for (const tab of ["Shop", "Recipe Book", "Café"]) {
    await go(user, tab);
    expect(coins()).toBe(40);
  }
  await user.dblClick(button("Next customer"));
  expect(coins()).toBe(40);
});

test("double-clicking Brew pays only once", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0);
  const user = start();
  await user.click(button("Milk"));
  await user.click(button("Strawberry"));
  await pause(user);
  await user.dblClick(button("Brew"));
  expect(coins()).toBe(40);
});

test("a correct drink tells screen reader players the new balance", async () => {
  const user = start();
  await serveDrink(user);
  const balance = screen.getByText("You now have 40 coins.", { exact: false });
  expect(balance.className).toBe("sr-only");
  expect(screen.getByRole("status").contains(balance)).toBe(true);
});

test("wrong and incomplete drinks never change coins", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0);
  const user = start();
  await user.click(button("Tea"));
  await pause(user);
  await user.click(button("Brew"));
  expect(coins()).toBe(30);
  await user.click(button("Coffee"));
  await pause(user);
  for (let i = 0; i < 4; i++) {
    await user.click(button("Brew"));
    await pause(user);
  }
  expect(screen.getByRole("status").textContent).toContain("not quite");
  expect(coins()).toBe(30);
});

test("buying deducts the price, stamps Owned, and thanks the player", async () => {
  const user = start();
  await go(user, "Shop");
  await user.click(button("Buy Berry bunting"));

  expect(coins()).toBe(15);
  expect(within(tag("Berry bunting")).getByText("Owned")).toBeTruthy();
  expect(queryButton("Buy Berry bunting")).toBeNull();
  expect(button("Unequip Berry bunting")).toBeTruthy();
  // The new balance is read out with the thanks, and only screen readers get it.
  expect(speech()).toBe("Thanks! Enjoy your Berry bunting. You have 15 coins left.");
  expect(screen.getByText("You have 15 coins left.", { exact: false }).className).toBe("sr-only");
});

test("equipping and unequipping don't repeat the balance", async () => {
  const user = start();
  await go(user, "Shop");
  await user.click(button("Buy Berry bunting"));
  await new Promise((resolve) => setTimeout(resolve, 550));
  await user.click(button("Unequip Berry bunting"));
  expect(speech()).toBe("Berry bunting is put away.");
});

test("buying keeps the button in view after the message changes", async () => {
  const user = start();
  await go(user, "Shop");
  const labels: (string | null)[] = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    labels.push(this.getAttribute("aria-label"));
  });
  try {
    await user.click(button("Buy Berry bunting"));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      block: "nearest",
    });
    // Only after the update, so it measures the button's new position.
    expect(labels).toEqual(["Unequip Berry bunting"]);
  } finally {
    delete (Element.prototype as Partial<Element>).scrollIntoView;
  }
});

test("a button players can't afford is described by how much is missing", async () => {
  const user = start();
  await go(user, "Shop");
  const lamp = button("Buy Café lamp");
  const note = within(tag("Café lamp")).getByText("Need 10 more coins");
  expect(lamp.getAttribute("aria-describedby")).toBe(note.id);
  expect(document.getElementById(lamp.getAttribute("aria-describedby")!)).toBe(note);
  // Affordable items have nothing extra to say.
  expect(button("Buy Berry bunting").hasAttribute("aria-describedby")).toBe(false);

  // Earning enough removes the note and the description together.
  await go(user, "Café");
  await serveDrink(user);
  await go(user, "Shop");
  expect(button("Buy Café lamp").hasAttribute("aria-describedby")).toBe(false);
  expect(within(tag("Café lamp")).queryByText(/^Need/)).toBeNull();
});

test("items players can't afford are disabled and say how much is missing", async () => {
  const user = start();
  await go(user, "Shop");
  expect(isDisabled("Buy Café lamp")).toBe(true);
  expect(within(tag("Café lamp")).getByText("Need 10 more coins")).toBeTruthy();
  expect(isDisabled("Buy Sage checkered rug")).toBe(false);

  await user.click(button("Buy Sage checkered rug"));
  expect(coins()).toBe(0);
  expect(isDisabled("Buy Berry bunting")).toBe(true);
  expect(within(tag("Berry bunting")).getByText("Need 15 more coins")).toBeTruthy();
});

test("earning enough unlocks an item that was too expensive", async () => {
  const user = start();
  await serveAndMoveOn(user, 1);
  await go(user, "Shop");
  expect(isDisabled("Buy Café lamp")).toBe(false);
  await user.click(button("Buy Café lamp"));
  expect(coins()).toBe(0);
});

test("double-clicking Buy pays once and doesn't take the item back down", async () => {
  const user = start();
  await go(user, "Shop");
  await user.dblClick(button("Buy Berry bunting"));
  expect(coins()).toBe(15);
  expect(button("Unequip Berry bunting")).toBeTruthy();
});

test("an owned item can't be bought again after putting it away", async () => {
  const user = start();
  await go(user, "Shop");
  await user.click(button("Buy Berry bunting"));
  await pause(user);
  await user.click(button("Unequip Berry bunting"));
  expect(queryButton("Buy Berry bunting")).toBeNull();
  expect(button("Equip Berry bunting")).toBeTruthy();
  expect(coins()).toBe(15);
});

test("the café starts complete, with no purchased decorations", () => {
  start();
  for (const id of decorationIds) {
    expect(screen.queryByAltText(decorations[id].name)).toBeNull();
  }
  expect(screen.queryByRole("img", { name: "Berry bunting" })).toBeNull();
  const art = [...scene().querySelectorAll("img")].map((img) => img.src);
  for (const original of ["window", "potted-plant", "wall-shelf"]) {
    expect(art.some((src) => src.includes(original))).toBe(true);
  }
});

test("buying shows a decoration in the café, and Unequip and Equip toggle it", async () => {
  const user = start();
  await go(user, "Shop");
  await user.click(button("Buy Sunny wall print"));
  await go(user, "Café");
  expect(screen.getByAltText("Sunny wall print")).toBeTruthy();

  await go(user, "Shop");
  await user.click(button("Unequip Sunny wall print"));
  expect(speech()).toBe("Sunny wall print is put away.");
  await go(user, "Café");
  expect(screen.queryByAltText("Sunny wall print")).toBeNull();

  await go(user, "Shop");
  await user.click(button("Equip Sunny wall print"));
  expect(speech()).toBe("Sunny wall print is out in the café.");
  await go(user, "Café");
  expect(screen.getByAltText("Sunny wall print")).toBeTruthy();
  expect(coins()).toBe(5);
});

test("all six decorations appear together, keeping the original art", async () => {
  const user = start();
  await serveAndMoveOn(user, 12);
  expect(coins()).toBe(150);
  await go(user, "Shop");
  for (const id of decorationIds) {
    await user.click(button(`Buy ${decorations[id].name}`));
    await pause(user);
  }
  expect(coins()).toBe(0);
  await go(user, "Café");

  expect(screen.getByRole("img", { name: "Berry bunting" })).toBeTruthy();
  for (const id of decorationIds.filter((d) => d !== "bunting")) {
    expect(screen.getByAltText(decorations[id].name)).toBeTruthy();
  }
  const art = [...scene().querySelectorAll("img")].map((img) => img.src);
  expect(art.some((src) => src.includes("potted-plant"))).toBe(true);
});

test("purchases and equipped items survive tabs and later orders", async () => {
  const user = start();
  await go(user, "Shop");
  await user.click(button("Buy Berry bunting"));
  await go(user, "Recipe Book");
  await go(user, "Café");
  expect(screen.getByRole("img", { name: "Berry bunting" })).toBeTruthy();

  await serveAndMoveOn(user, 1);
  expect(screen.getByRole("img", { name: "Berry bunting" })).toBeTruthy();
  expect(coins()).toBe(25);

  await go(user, "Shop");
  expect(within(tag("Berry bunting")).getByText("Owned")).toBeTruthy();
});

test("shopping mid-drink leaves the selected ingredients in place", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0);
  const user = start();
  await user.click(button("Milk"));
  await go(user, "Shop");
  await user.click(button("Buy Berry bunting"));
  await go(user, "Café");
  expect(button("Milk").getAttribute("aria-pressed")).toBe("true");
  expect(button("Remove Milk")).toBeTruthy();
  await user.click(button("Strawberry"));
  await pause(user);
  await user.click(button("Brew"));
  expect(coins()).toBe(25);
});

test("items hidden on narrow screens are labeled, before and after buying", async () => {
  const user = start();
  await go(user, "Shop");
  const note = "Shows on larger screens";
  expect(within(tag("Strawberry planter")).getByText(note)).toBeTruthy();
  expect(within(tag("Cozy cushion")).getByText(note)).toBeTruthy();
  for (const name of ["Sage checkered rug", "Sunny wall print", "Café lamp"]) {
    expect(within(tag(name)).queryByText(note)).toBeNull();
  }
  await user.click(button("Buy Strawberry planter"));
  expect(within(tag("Strawberry planter")).getByText(note)).toBeTruthy();
  expect(speech()).toContain("It shows on larger screens.");

  await pause(user);
  await user.click(button("Unequip Strawberry planter"));
  expect(speech()).toBe("Strawberry planter is put away.");
});
