// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import App from "./App";
import { customerIds, customers } from "./data/customers";
import { recipeIds, recipes } from "./data/recipes";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Makes the next order pick these positions, and any later random pick differ. */
function fixOrder(customerIndex: number, recipeIndex: number) {
  return vi
    .spyOn(Math, "random")
    .mockReturnValue(
      customerIndex === 0 && recipeIndex === 0 ? 0.999999 : 0,
    )
    .mockReturnValueOnce((customerIndex + 0.5) / customerIds.length)
    .mockReturnValueOnce((recipeIndex + 0.5) / recipeIds.length);
}

const altFor = (id: (typeof customerIds)[number]) =>
  `${customers[id].name} the ${customers[id].species}`;

const counter = () =>
  screen
    .getByRole("region", { name: "Café counter" })
    .querySelector(".customer") as HTMLElement;

const ticket = () => screen.getByRole("region", { name: "Order #01" });

test.each(customerIds.map((id, i) => [id, i] as const))(
  "shows %s at the counter with the other customers still in the café",
  (id, index) => {
    fixOrder(index, 0);
    render(<App />);

    expect(within(counter()).getByAltText(altFor(id))).toBeTruthy();
    expect(
      within(counter()).getByText(customers[id].request("Strawberry milk")),
    ).toBeTruthy();
    expect(within(ticket()).getByText(`For ${customers[id].name}`)).toBeTruthy();

    for (const other of customerIds) {
      expect(screen.getByAltText(altFor(other))).toBeTruthy();
    }
  },
);

test.each(recipeIds.map((id, i) => [id, i] as const))(
  "shows %s on the ticket using the shared recipe",
  (id, index) => {
    fixOrder(1, index);
    render(<App />);
    const recipe = recipes[id];

    expect(within(ticket()).getByText(recipe.name)).toBeTruthy();
    expect(ticket().querySelector(".formula-names")).toBeNull();
    expect(
      within(counter()).getByText(customers.biscuit.request(recipe.name)),
    ).toBeTruthy();
  },
);

test("keeps the same order after switching screens", async () => {
  const user = userEvent.setup();
  fixOrder(2, 3);
  render(<App />);
  const speech = customers.maple.request(recipes["hot-chocolate"].name);
  expect(within(counter()).getByText(speech)).toBeTruthy();

  for (const tab of ["Shop", "Recipe Book", "Café", "Recipe Book", "Café"]) {
    await user.click(screen.getByRole("button", { name: tab }));
  }

  expect(within(counter()).getByText(speech)).toBeTruthy();
  expect(within(counter()).getByAltText(altFor("maple"))).toBeTruthy();
  expect(within(ticket()).getByText("For Maple")).toBeTruthy();
  expect(within(ticket()).getByText("Hot chocolate")).toBeTruthy();
});
