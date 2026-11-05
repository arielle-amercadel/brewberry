// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import App from "./App";

afterEach(cleanup);

const headingNames = () =>
  screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);

test("Café shows Mochi, the order ticket, all ingredients, and a disabled Brew", () => {
  render(<App />);
  expect(screen.getByAltText("Mochi the bunny")).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Order #01" })).toBeTruthy();
  const crates = within(
    screen.getByRole("region", { name: "Prep station" }),
  ).getAllByRole("listitem");
  expect(crates.map((c) => c.textContent)).toEqual([
    "Milk",
    "Strawberry",
    "Tea",
    "Coffee",
    "Cocoa",
    "Honey",
  ]);
  const brew = screen.getByRole("button", { name: /brew/i });
  expect((brew as HTMLButtonElement).disabled).toBe(true);
});

test("Shop lists every decoration with a preview price and no buy button", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: "Shop" }));
  expect(screen.getByAltText("Hedgehog shopkeeper")).toBeTruthy();
  expect(headingNames()).toEqual([
    "Strawberry planter",
    "Sage checkered rug",
    "Sunny wall print",
    "Café lamp",
    "Berry bunting",
    "Cozy cushion",
  ]);
  expect(screen.getAllByText("coins, preview price")).toHaveLength(6);
  expect(screen.getAllByRole("button")).toHaveLength(3);
});

test("Recipe Book shows all five drinks with their ingredients", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: "Recipe Book" }));
  expect(headingNames()).toEqual([
    "Strawberry milk",
    "Honey tea",
    "Café latte",
    "Hot chocolate",
    "Berry tea",
  ]);
  expect(
    within(screen.getByRole("main"))
      .getAllByRole("listitem")
      .map((card) => card.querySelector(".formula-names")?.textContent),
  ).toEqual([
    "Milk + Strawberry",
    "Tea + Honey",
    "Coffee + Milk",
    "Milk + Cocoa",
    "Tea + Strawberry",
  ]);
});
