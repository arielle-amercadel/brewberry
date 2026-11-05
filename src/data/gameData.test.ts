import { afterEach, describe, expect, test, vi } from "vitest";
import { sprites } from "../assets/sprites/manifest";
import { customerIds, customers } from "./customers";
import { ingredientIds, ingredients } from "./ingredients";
import { createNextOrder, createOrder } from "./orders";
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

  test("thank the player in their own way", () => {
    expect(customerIds.map((id) => customers[id].thanks)).toEqual([
      "Yum, thank you!",
      "Purr-fect!",
      "Bear-y tasty!",
      "Ribbit-ing!",
    ]);
  });
});

describe("recipes", () => {
  test("match the five drinks and their ingredients", () => {
    expect(
      recipeIds.map((id) => [
        recipes[id].name,
        recipes[id].items.map((item) => ingredients[item].name),
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
    for (const id of recipeIds) {
      expect(sprites[recipes[id].sprite]).toBeTruthy();
      for (const item of recipes[id].items) {
        expect(ingredientIds).toContain(item);
      }
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

describe("createNextOrder", () => {
  const previous = (customerId: (typeof customerIds)[number]) => ({
    customerId,
    recipeId: recipeIds[0],
  });

  test("always chooses a different customer, at any random value", () => {
    for (const customerId of customerIds) {
      for (const value of [0, 0.25, 0.5, 0.75, 0.999999]) {
        const next = createNextOrder(previous(customerId), () => value);
        expect(next.customerId).not.toBe(customerId);
        expect(customerIds).toContain(next.customerId);
        expect(recipeIds).toContain(next.recipeId);
      }
    }
  });

  test("can reach all three other customers", () => {
    const seen = [0, 0.5, 0.999999].map(
      (value) => createNextOrder(previous("mochi"), () => value).customerId,
    );
    expect(seen).toEqual(["biscuit", "maple", "matcha"]);
  });

  test("may repeat the drink", () => {
    expect(createNextOrder(previous("mochi"), () => 0).recipeId).toBe(
      recipeIds[0],
    );
  });

  test("never repeats over a long run of real randomness", () => {
    let order = createOrder();
    for (let i = 0; i < 500; i++) {
      const next = createNextOrder(order);
      expect(next.customerId).not.toBe(order.customerId);
      order = next;
    }
  });
});
