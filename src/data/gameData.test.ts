import { afterEach, describe, expect, test, vi } from "vitest";
import { sprites } from "../assets/sprites/manifest";
import { customerIds, customers } from "./customers";
import { ingredients } from "./ingredients";
import { createOrder } from "./orders";
import { recipeIds, recipes } from "./recipes";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("customers", () => {
  test("are the four named animals", () => {
    expect(
      customerIds.map((id) => [customers[id].name, customers[id].species]),
    ).toEqual([
      ["Mochi", "bunny"],
      ["Biscuit", "cat"],
      ["Maple", "bear"],
      ["Matcha", "frog"],
    ]);
  });

  test("use sprites that exist, and each customer's are their own", () => {
    const used = customerIds.flatMap((id) => [
      customers[id].sprite,
      customers[id].blinkSprite,
    ]);
    for (const sprite of used) expect(sprites[sprite]).toBeTruthy();
    expect(new Set(used).size).toBe(used.length);
  });

  test("say the requested drink in their own way", () => {
    expect(customers.mochi.request("Honey tea")).toBe("Honey tea, please!");
    expect(customers.biscuit.request("Honey tea")).toBe(
      "Honey tea, purr-lease!",
    );
    expect(customers.maple.request("Honey tea")).toBe(
      "Honey tea? Bear-y nice!",
    );
    expect(customers.matcha.request("Honey tea")).toBe("Honey tea? Ribbit!");
  });

  test("keep every order short enough for the speech bubble", () => {
    for (const customerId of customerIds) {
      for (const recipeId of recipeIds) {
        const line = customers[customerId].request(recipes[recipeId].name);
        expect(line.length, line).toBeLessThanOrEqual(30);
      }
    }
  });
});

describe("recipes", () => {
  test("match the five drinks and their ingredients", () => {
    expect(
      recipeIds.map((id) => [
        recipes[id].name,
        recipes[id].items.map((item) => item.name),
      ]),
    ).toEqual([
      ["Strawberry milk", ["Milk", "Strawberry"]],
      ["Honey tea", ["Tea", "Honey"]],
      ["Café latte", ["Coffee", "Milk"]],
      ["Hot chocolate", ["Milk", "Cocoa"]],
      ["Berry tea", ["Tea", "Strawberry"]],
    ]);
  });

  test("use existing ingredients and drink sprites", () => {
    const station = Object.values(ingredients);
    for (const id of recipeIds) {
      expect(sprites[recipes[id].sprite]).toBeTruthy();
      for (const item of recipes[id].items) expect(station).toContain(item);
    }
  });
});

describe("createOrder", () => {
  test("stays valid at the lowest and highest random values", () => {
    expect(createOrder(() => 0)).toEqual({
      customerId: "mochi",
      recipeId: "strawberry-milk",
    });
    expect(createOrder(() => 0.999999)).toEqual({
      customerId: "matcha",
      recipeId: "berry-tea",
    });
  });

  test("can choose every customer with every recipe", () => {
    customerIds.forEach((customerId, c) => {
      recipeIds.forEach((recipeId, r) => {
        const values = [
          (c + 0.5) / customerIds.length,
          (r + 0.5) / recipeIds.length,
        ];
        expect(createOrder(() => values.shift() as number)).toEqual({
          customerId,
          recipeId,
        });
      });
    });
  });

  test("always uses existing data with real randomness", () => {
    for (let i = 0; i < 500; i++) {
      const order = createOrder();
      expect(customerIds).toContain(order.customerId);
      expect(recipeIds).toContain(order.recipeId);
    }
  });

  test("uses Math.random by default", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(createOrder().customerId).toBe("mochi");
  });
});
