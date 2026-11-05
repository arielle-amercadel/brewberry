// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import App from "./App";
import { customerIds, customers } from "./data/customers";
import { ingredients, type IngredientId } from "./data/ingredients";
import { recipeIds, recipes } from "./data/recipes";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Starts the game with this order; later random picks use the last customer. */
function startWith(customerIndex: number, recipeIndex: number) {
  vi.spyOn(Math, "random")
    .mockReturnValue(0.999999)
    .mockReturnValueOnce((customerIndex + 0.5) / customerIds.length)
    .mockReturnValueOnce((recipeIndex + 0.5) / recipeIds.length);
  render(<App />);
  return userEvent.setup();
}

const button = (name: string | RegExp) => screen.getByRole("button", { name });
const queryButton = (name: string | RegExp) =>
  screen.queryByRole("button", { name });
const crate = (name: string) =>
  within(screen.getByRole("region", { name: "Prep station" })).getByRole(
    "button",
    { name },
  );
const isDisabled = (element: HTMLElement) =>
  (element as HTMLButtonElement).disabled;
const message = () => screen.getByRole("status").textContent;
const bubble = () => document.querySelector(".bubble p")?.textContent;
const ticket = () => document.querySelector(".ticket") as HTMLElement;

const names = (items: IngredientId[]) =>
  items.map((id) => ingredients[id].name);

/** Moves the pointer away, so the next click isn't part of a double-click. */
const pause = (user: UserEvent) => user.pointer({ target: document.body });

async function pickAndBrew(user: UserEvent, ...names: string[]) {
  for (const name of names) await user.click(crate(name));
  await user.click(button("Brew"));
}

describe("selecting ingredients", () => {
  test("a crate fills a slot, and tapping it again removes it", async () => {
    const user = startWith(0, 0);
    expect(crate("Milk").getAttribute("aria-pressed")).toBe("false");
    expect(queryButton("Remove Milk")).toBeNull();

    await user.click(crate("Milk"));
    expect(crate("Milk").getAttribute("aria-pressed")).toBe("true");
    expect(button("Remove Milk")).toBeTruthy();

    await user.click(crate("Milk"));
    expect(crate("Milk").getAttribute("aria-pressed")).toBe("false");
    expect(queryButton("Remove Milk")).toBeNull();
  });

  test("removing from a slot returns focus to its crate", async () => {
    const user = startWith(0, 0);
    await user.click(crate("Tea"));
    await user.click(button("Remove Tea"));
    expect(queryButton("Remove Tea")).toBeNull();
    expect(document.activeElement).toBe(crate("Tea"));
  });

  test("a third ingredient shows a friendly message", async () => {
    const user = startWith(0, 0);
    await user.click(crate("Milk"));
    await user.click(crate("Tea"));
    await user.click(crate("Honey"));
    expect(message()).toContain("The mug is full");
    expect(queryButton("Remove Honey")).toBeNull();
  });

  test("Clear empties both slots and is disabled when already empty", async () => {
    const user = startWith(0, 0);
    expect(isDisabled(button("Clear"))).toBe(true);
    await user.click(crate("Milk"));
    await user.click(crate("Tea"));
    expect(isDisabled(button("Clear"))).toBe(false);

    await user.click(button("Clear"));
    expect(queryButton("Remove Milk")).toBeNull();
    expect(queryButton("Remove Tea")).toBeNull();
    expect(isDisabled(button("Clear"))).toBe(true);
    expect(document.activeElement).toBe(crate("Milk"));
  });
});

describe("brewing", () => {
  test("Brew is disabled until something is selected", async () => {
    const user = startWith(0, 0);
    expect(isDisabled(button("Brew"))).toBe(true);
    await user.click(crate("Milk"));
    expect(isDisabled(button("Brew"))).toBe(false);
  });

  test("one ingredient asks for one more", async () => {
    const user = startWith(0, 0);
    await pickAndBrew(user, "Milk");
    expect(message()).toContain("needs one more ingredient");
  });

  test("a wrong pair keeps the order and points to the Recipe Book", async () => {
    const user = startWith(0, 3);
    await pickAndBrew(user, "Milk", "Tea");
    expect(message()).toContain("not quite Hot chocolate");
    expect(message()).toContain("Recipe Book");
    expect(queryButton("Next customer")).toBeNull();
    expect(button("Remove Milk")).toBeTruthy();
    expect(bubble()).toBe("Hot chocolate, please!");
  });

  test("the player can retry until it's right, in either order", async () => {
    const user = startWith(0, 0);
    await pickAndBrew(user, "Tea", "Coffee");
    for (let i = 0; i < 5; i++) {
      await pause(user);
      await user.click(button("Brew"));
      expect(message()).toContain("not quite");
    }
    await user.click(button("Clear"));
    await pickAndBrew(user, "Strawberry", "Milk");
    expect(button("Next customer")).toBeTruthy();
  });

  test.each(recipeIds.map((id, i) => [id, i] as const))(
    "%s can be made from its shared recipe",
    async (id, index) => {
      const user = startWith(1, index);
      await pickAndBrew(user, ...names(recipes[id].items));
      expect(message()).toContain(`${recipes[id].name} is ready!`);
    },
  );
});

describe("completing an order", () => {
  test("shows thanks, the finished drink, and the Served stamp", async () => {
    const user = startWith(2, 1);
    expect(ticket().textContent).not.toContain("Preview");
    expect(within(ticket()).queryByText("Served")).toBeNull();

    await pickAndBrew(user, "Tea", "Honey");

    expect(bubble()).toBe("Bear-y tasty!");
    expect(within(ticket()).getByText("Served")).toBeTruthy();
    expect(screen.getByAltText("Finished Honey tea")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "Maple says: Bear-y tasty!",
    );
    expect(message()).toContain("+10 coins");
  });

  test("locks the mat until the player continues", async () => {
    const user = startWith(0, 0);
    await pickAndBrew(user, "Milk", "Strawberry");
    expect(isDisabled(crate("Tea"))).toBe(true);
    expect(isDisabled(button("Clear"))).toBe(true);
    expect(isDisabled(button("Remove Milk"))).toBe(true);
    expect(queryButton("Brew")).toBeNull();
  });

  test("double-clicking Brew doesn't skip the success message", async () => {
    const user = startWith(0, 0);
    await user.click(crate("Milk"));
    await user.click(crate("Strawberry"));
    await pause(user);
    await user.dblClick(button("Brew"));
    expect(within(ticket()).getByText("Served")).toBeTruthy();
    expect(button("Next customer")).toBeTruthy();
  });

  test("Next customer brings a different customer and a clean mat", async () => {
    const user = startWith(0, 0);
    await pickAndBrew(user, "Milk", "Strawberry");
    await pause(user);
    await user.click(button("Next customer"));

    expect(
      within(document.querySelector(".customer") as HTMLElement).getByAltText(
        "Matcha the frog",
      ),
    ).toBeTruthy();
    expect(bubble()).toBe("Berry tea? Ribbit!");
    expect(screen.getByRole("heading", { name: "Order #02" })).toBeTruthy();
    expect(within(ticket()).queryByText("Served")).toBeNull();
    expect(queryButton("Remove Milk")).toBeNull();
    expect(crate("Milk").getAttribute("aria-pressed")).toBe("false");
    expect(isDisabled(button("Brew"))).toBe(true);
    expect(message()).toContain("Matcha would like Berry tea");
    expect(document.activeElement).toBe(crate("Milk"));
    for (const id of customerIds) {
      expect(
        screen.getByAltText(`${customers[id].name} the ${customers[id].species}`),
      ).toBeTruthy();
    }
  });

  test("many orders in a row always change customer", async () => {
    render(<App />);
    const user = userEvent.setup();
    const counterName = () =>
      (document.querySelector(".customer img[alt]") as HTMLImageElement).alt;
    const drinkByName = (name: string | null | undefined) =>
      recipeIds.map((id) => recipes[id]).find((r) => r.name === name);

    for (let n = 1; n <= 12; n++) {
      // Order numbers start again each day.
      const label = `Order #0${((n - 1) % 5) + 1}`;
      expect(screen.getByRole("heading", { name: label })).toBeTruthy();
      const before = counterName();
      const drink = drinkByName(
        ticket().querySelector(".ticket-drink")?.textContent,
      );
      await pickAndBrew(user, ...names(drink!.items));
      await pause(user);
      if (n % 5 === 0) {
        await user.click(button("Finish Day"));
        await pause(user);
        await user.click(button("Start Next Day"));
      } else {
        await user.click(button("Next customer"));
      }
      expect(counterName()).not.toBe(before);
    }
  });
});

describe("switching screens", () => {
  const visit = async (user: UserEvent, ...tabs: string[]) => {
    for (const tab of tabs) await user.click(button(tab));
  };

  test("selected ingredients survive a Recipe Book visit", async () => {
    const user = startWith(0, 0);
    await user.click(crate("Milk"));
    await visit(user, "Recipe Book");
    expect(screen.getByRole("heading", { name: "Your recipe book" })).toBeTruthy();
    await visit(user, "Café");
    expect(crate("Milk").getAttribute("aria-pressed")).toBe("true");
    expect(button("Remove Milk")).toBeTruthy();

    await pickAndBrew(user, "Strawberry");
    expect(button("Next customer")).toBeTruthy();
  });

  test("wrong-answer feedback and the order survive", async () => {
    const user = startWith(1, 2);
    await pickAndBrew(user, "Milk", "Tea");
    await visit(user, "Shop", "Recipe Book", "Café");
    expect(message()).toContain("not quite Café latte");
    expect(bubble()).toBe("Café latte, purr-lease!");
    expect(button("Remove Tea")).toBeTruthy();
  });

  test("a finished drink stays finished, and the order number holds", async () => {
    const user = startWith(0, 0);
    await pickAndBrew(user, "Milk", "Strawberry");
    await visit(user, "Recipe Book", "Shop", "Café");
    expect(within(ticket()).getByText("Served")).toBeTruthy();
    expect(button("Next customer")).toBeTruthy();
    await pause(user);
    await user.click(button("Next customer"));
    await visit(user, "Shop", "Café");
    expect(screen.getByRole("heading", { name: "Order #02" })).toBeTruthy();
    expect(bubble()).toBe("Berry tea? Ribbit!");
  });

  test("the Recipe Book still lists ingredients the ticket no longer shows", async () => {
    const user = startWith(0, 3);
    expect(ticket().textContent).not.toContain("Milk + Cocoa");
    await visit(user, "Recipe Book");
    expect(screen.getByText("Milk + Cocoa")).toBeTruthy();
  });
});
