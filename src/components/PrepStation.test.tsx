// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useReducer } from "react";
import { afterEach, expect, test } from "vitest";
import { cafeReducer, createCafeState, type CafeState } from "../data/cafeGame";
import type { IngredientId } from "../data/ingredients";
import { PrepStation } from "./PrepStation";

afterEach(cleanup);

/** Starts the station from state that has been through JSON, as a save would. */
function renderRestored(selected: IngredientId[], feedback: CafeState["feedback"] = null) {
  const saved = JSON.stringify({
    ...createCafeState({ customerId: "mochi", recipeId: "strawberry-milk" }),
    selected,
    feedback,
  });

  function Restored() {
    const [game, dispatch] = useReducer(
      cafeReducer,
      JSON.parse(saved) as CafeState,
    );
    return <PrepStation game={game} dispatch={dispatch} />;
  }

  render(<Restored />);
  return userEvent.setup();
}

const button = (name: string) => screen.getByRole("button", { name });
const pressed = (name: string) => button(name).getAttribute("aria-pressed");
const message = () => screen.getByRole("status").textContent;

test("restored ingredients show as pressed and fill their slots", () => {
  renderRestored(["milk", "tea"]);
  expect(pressed("Milk")).toBe("true");
  expect(pressed("Tea")).toBe("true");
  for (const name of ["Strawberry", "Coffee", "Cocoa", "Honey"]) {
    expect(pressed(name)).toBe("false");
  }
  expect(button("Remove Milk")).toBeTruthy();
  expect(button("Remove Tea")).toBeTruthy();
});

test("a restored ingredient can be removed from its slot", async () => {
  const user = renderRestored(["milk", "tea"]);
  await user.click(button("Remove Milk"));
  expect(pressed("Milk")).toBe("false");
  expect(pressed("Tea")).toBe("true");
  expect(screen.queryByRole("button", { name: "Remove Milk" })).toBeNull();
  expect(document.activeElement).toBe(button("Milk"));
});

test("a restored ingredient can be removed from its crate", async () => {
  const user = renderRestored(["milk"]);
  await user.click(button("Milk"));
  expect(pressed("Milk")).toBe("false");
  expect(screen.queryByRole("button", { name: "Remove Milk" })).toBeNull();
});

test("a restored selection can be cleared", async () => {
  const user = renderRestored(["milk", "tea"]);
  await user.click(button("Clear"));
  expect(pressed("Milk")).toBe("false");
  expect(pressed("Tea")).toBe("false");
});

test("the right restored pair brews, in either order", async () => {
  for (const picks of [
    ["milk", "strawberry"],
    ["strawberry", "milk"],
  ] as IngredientId[][]) {
    const user = renderRestored(picks);
    await user.click(button("Brew"));
    expect(message()).toContain("Strawberry milk is ready!");
    cleanup();
  }
});

test("a wrong restored pair gets the friendly message", async () => {
  const user = renderRestored(["milk", "tea"]);
  await user.click(button("Brew"));
  expect(message()).toContain("not quite Strawberry milk");
  expect(pressed("Milk")).toBe("true");
});

test("a third ingredient is refused on a full restored mug", async () => {
  const user = renderRestored(["milk", "tea"]);
  await user.click(button("Honey"));
  expect(message()).toContain("The mug is full");
  expect(pressed("Honey")).toBe("false");
});

test("a restored finished drink stays locked with Next customer showing", () => {
  renderRestored(["milk", "strawberry"], "correct");
  expect(button("Next customer")).toBeTruthy();
  expect(pressed("Milk")).toBe("true");
  expect((button("Honey") as HTMLButtonElement).disabled).toBe(true);
});
