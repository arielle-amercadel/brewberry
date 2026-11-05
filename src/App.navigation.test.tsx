// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import App from "./App";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Always starts with Mochi ordering strawberry milk. */
function start() {
  vi.spyOn(Math, "random").mockReturnValue(0);
  render(<App />);
  return userEvent.setup();
}

const button = (name: string) => screen.getByRole("button", { name });
const heading = (name: string) => screen.getByRole("heading", { name, level: 2 });
const coins = () =>
  Number(within(screen.getByRole("banner")).getByText(/^\d+$/).textContent);
const ticket = () => document.querySelector(".ticket") as HTMLElement;
const longerThanTheGuard = () =>
  new Promise((resolve) => setTimeout(resolve, 550));

/** fireEvent returns false when the key's default action was prevented. */
function expectRepeatsHandled(target: HTMLElement) {
  for (const key of ["Enter", " "]) {
    expect(fireEvent.keyDown(target, { key, repeat: true })).toBe(false);
    expect(fireEvent.keyDown(target, { key })).toBe(true);
  }
  for (const key of ["Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]) {
    expect(fireEvent.keyDown(target, { key, repeat: true })).toBe(true);
  }
  expect(
    fireEvent.keyDown(target, { key: "Tab", shiftKey: true, repeat: true }),
  ).toBe(true);
}

const screens = [
  ["Shop", "The cozy shop", "Buy Strawberry planter"],
  ["Recipe Book", "Your recipe book", "article"],
] as const;

describe("switching screens", () => {
  test.each(screens)("%s opens at the top of the page", async (tab) => {
    const user = start();
    document.documentElement.scrollTop = 500;
    await user.click(button(tab));
    expect(document.documentElement.scrollTop).toBe(0);
  });

  test("returning to the Café also opens at the top", async () => {
    const user = start();
    await user.click(button("Shop"));
    document.documentElement.scrollTop = 500;
    await user.click(button("Café"));
    expect(document.documentElement.scrollTop).toBe(0);
    expect(document.activeElement).toBe(heading("Welcome to the café"));
  });

  test("selecting the current tab doesn't scroll or move focus", async () => {
    const user = start();
    document.documentElement.scrollTop = 500;
    await user.click(button("Café"));
    expect(document.documentElement.scrollTop).toBe(500);
    expect(document.activeElement).toBe(button("Café"));
  });

  test.each(screens)("%s takes focus on its heading by mouse", async (tab, name) => {
    const user = start();
    await user.click(button(tab));
    expect(document.activeElement).toBe(heading(name));
  });

  test.each(screens)("%s takes focus on its heading by keyboard", async (tab, name) => {
    const user = start();
    button(tab).focus();
    await user.keyboard("{Enter}");
    expect(document.activeElement).toBe(heading(name));
  });

  test("the next Tab press goes into the new screen", async () => {
    const user = start();
    button("Shop").focus();
    await user.keyboard("{Enter}");
    await user.tab();
    expect(document.activeElement).toBe(button("Buy Strawberry planter"));

    button("Recipe Book").focus();
    await user.keyboard(" ");
    await user.tab();
    expect(document.activeElement?.tagName).toBe("ARTICLE");

    button("Café").focus();
    await user.keyboard("{Enter}");
    await user.tab();
    expect(document.activeElement).toBe(button("Milk"));
  });

  test("the tabs still report the current screen, and headings aren't tab stops", async () => {
    const user = start();
    await user.click(button("Shop"));
    expect(button("Shop").getAttribute("aria-current")).toBe("page");
    expect(heading("The cozy shop").tabIndex).toBe(-1);
  });
});

describe("repeated presses on Brew", () => {
  async function readyToBrew() {
    const user = start();
    await user.click(button("Milk"));
    await user.click(button("Strawberry"));
    button("Brew").focus();
    return user;
  }

  test("Enter twice quickly stays on the success screen", async () => {
    const user = await readyToBrew();
    await user.keyboard("{Enter}{Enter}");
    expect(within(ticket()).getByText("Served")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Order #01" })).toBeTruthy();
    expect(button("Next customer")).toBeTruthy();
    expect(coins()).toBe(40);
  });

  test("Enter then Space quickly also stays", async () => {
    const user = await readyToBrew();
    await user.keyboard("{Enter} ");
    expect(button("Next customer")).toBeTruthy();
  });

  test("holding Enter down only brews", async () => {
    const user = await readyToBrew();
    await user.keyboard("{Enter>5/}");
    expect(button("Next customer")).toBeTruthy();
    expect(coins()).toBe(40);
  });

  test("only held Enter and Space are stopped; Tab and arrows still repeat", async () => {
    await readyToBrew();
    expectRepeatsHandled(button("Brew"));
  });

  test("a later Enter moves on normally, keeping focus", async () => {
    const user = await readyToBrew();
    await user.keyboard("{Enter}");
    await longerThanTheGuard();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("heading", { name: "Order #02" })).toBeTruthy();
    expect(document.activeElement).toBe(button("Milk"));
    expect(coins()).toBe(40);
  });

  test("a later Space moves on normally too", async () => {
    const user = await readyToBrew();
    await user.keyboard(" ");
    await longerThanTheGuard();
    await user.keyboard(" ");
    expect(screen.getByRole("heading", { name: "Order #02" })).toBeTruthy();
  });

  test("double-clicking Brew is still protected", async () => {
    const user = await readyToBrew();
    await user.pointer({ target: document.body });
    await user.dblClick(button("Brew"));
    expect(button("Next customer")).toBeTruthy();
  });

  test("a wrong drink can be retried straight away by keyboard", async () => {
    const user = start();
    await user.click(button("Tea"));
    await user.click(button("Coffee"));
    button("Brew").focus();
    await user.keyboard("{Enter}{Enter}");
    expect(screen.getByRole("status").textContent).toContain("not quite");
    await user.click(button("Coffee"));
    await user.click(button("Tea"));
    await user.click(button("Milk"));
    await user.click(button("Strawberry"));
    button("Brew").focus();
    await user.keyboard("{Enter}");
    expect(button("Next customer")).toBeTruthy();
  });
});

describe("repeated presses on Buy", () => {
  async function inShop() {
    const user = start();
    await user.click(button("Shop"));
    button("Buy Berry bunting").focus();
    return user;
  }

  test("Enter twice quickly buys once and stays equipped", async () => {
    const user = await inShop();
    await user.keyboard("{Enter}{Enter}");
    expect(coins()).toBe(15);
    expect(button("Unequip Berry bunting")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Thanks!");
  });

  test("Enter then Space quickly also stays equipped", async () => {
    const user = await inShop();
    await user.keyboard("{Enter} ");
    expect(button("Unequip Berry bunting")).toBeTruthy();
  });

  test("holding Enter down only buys", async () => {
    const user = await inShop();
    await user.keyboard("{Enter>5/}");
    expect(coins()).toBe(15);
    expect(button("Unequip Berry bunting")).toBeTruthy();
  });

  test("only held Enter and Space are stopped; Tab and arrows still repeat", async () => {
    await inShop();
    expectRepeatsHandled(button("Buy Berry bunting"));
  });

  test("a later press unequips, keeping focus on the item", async () => {
    const user = await inShop();
    await user.keyboard("{Enter}");
    await longerThanTheGuard();
    await user.keyboard("{Enter}");
    expect(button("Equip Berry bunting")).toBeTruthy();
    expect(document.activeElement).toBe(button("Equip Berry bunting"));
  });

  test("equipping stays quick by keyboard once the purchase has settled", async () => {
    const user = await inShop();
    await user.keyboard("{Enter}");
    await longerThanTheGuard();
    await user.keyboard("{Enter}{Enter}{Enter}");
    expect(button("Equip Berry bunting")).toBeTruthy();
    expect(coins()).toBe(15);
  });

  test("a different item can be bought straight after", async () => {
    const user = start();
    await user.click(button("Milk"));
    await user.click(button("Strawberry"));
    await user.pointer({ target: document.body });
    await user.click(button("Brew"));
    expect(coins()).toBe(40);
    await user.click(button("Shop"));
    button("Buy Berry bunting").focus();
    await user.keyboard("{Enter}");
    button("Buy Sunny wall print").focus();
    await user.keyboard("{Enter}");
    expect(button("Unequip Sunny wall print")).toBeTruthy();
    expect(coins()).toBe(0);
  });

  test("double-clicking Buy is still protected", async () => {
    const user = await inShop();
    await user.pointer({ target: document.body });
    await user.dblClick(button("Buy Berry bunting"));
    expect(button("Unequip Berry bunting")).toBeTruthy();
  });
});
