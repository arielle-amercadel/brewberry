import { describe, expect, test } from "vitest";
import {
  cafeReducer,
  createCafeState,
  matchesRecipe,
  SLOT_COUNT,
  type CafeAction,
  type CafeState,
} from "./cafeGame";
import { ingredientIds, type IngredientId } from "./ingredients";
import type { Order } from "./orders";
import { recipeIds, recipes } from "./recipes";

const milk: IngredientId = "milk";
const strawberry: IngredientId = "strawberry";
const tea: IngredientId = "tea";
const coffee: IngredientId = "coffee";
const honey: IngredientId = "honey";

const order: Order = { customerId: "mochi", recipeId: "strawberry-milk" };
const nextOrder: Order = { customerId: "maple", recipeId: "honey-tea" };

const run = (actions: CafeAction[], start = createCafeState(order)): CafeState =>
  actions.reduce(cafeReducer, start);
const toggle = (ingredientId: IngredientId): CafeAction => ({
  type: "toggle",
  ingredientId,
});
const brew: CafeAction = { type: "brew" };

describe("matchesRecipe", () => {
  test.each(recipeIds)("accepts %s in either order", (id) => {
    const recipe = recipes[id];
    expect(matchesRecipe([...recipe.items], recipe)).toBe(true);
    expect(matchesRecipe([...recipe.items].reverse(), recipe)).toBe(true);
  });

  test.each(recipeIds)("rejects every other pair for %s", (id) => {
    const recipe = recipes[id];
    const wanted = new Set<unknown>(recipe.items);
    for (const a of ingredientIds) {
      for (const b of ingredientIds) {
        if (a === b || (wanted.has(a) && wanted.has(b))) continue;
        expect(matchesRecipe([a, b], recipe)).toBe(false);
      }
    }
  });

  test("rejects empty and partial selections", () => {
    const recipe = recipes["strawberry-milk"];
    expect(matchesRecipe([], recipe)).toBe(false);
    expect(matchesRecipe([milk], recipe)).toBe(false);
  });

  test("every recipe fits the two slots", () => {
    for (const id of recipeIds) {
      expect(recipes[id].items).toHaveLength(SLOT_COUNT);
    }
  });
});

describe("selecting ingredients", () => {
  test("adds in the order chosen", () => {
    expect(run([toggle(tea), toggle(milk)]).selected).toEqual([tea, milk]);
  });

  test("selecting again removes, so duplicates are impossible", () => {
    expect(run([toggle(tea), toggle(tea)]).selected).toEqual([]);
  });

  test("a third ingredient is refused with a message", () => {
    const state = run([toggle(tea), toggle(milk), toggle(honey)]);
    expect(state.selected).toEqual([tea, milk]);
    expect(state.feedback).toBe("full");
  });

  test("removing from a full mug makes room again", () => {
    const state = run([toggle(tea), toggle(milk), toggle(tea), toggle(honey)]);
    expect(state.selected).toEqual([milk, honey]);
  });

  test("changing the selection clears earlier feedback", () => {
    const wrong = run([toggle(tea), toggle(milk), brew]);
    expect(wrong.feedback).toBe("wrong");
    expect(run([toggle(tea)], wrong).feedback).toBeNull();
    expect(run([{ type: "clear" }], wrong).feedback).toBeNull();
  });

  test("clear empties the mat", () => {
    expect(run([toggle(tea), toggle(milk), { type: "clear" }]).selected).toEqual(
      [],
    );
  });
});

describe("brewing", () => {
  test("nothing happens with an empty mat", () => {
    const start = createCafeState(order);
    expect(cafeReducer(start, brew)).toBe(start);
  });

  test("one ingredient is incomplete and stays selected", () => {
    const state = run([toggle(milk), brew]);
    expect(state.feedback).toBe("incomplete");
    expect(state.selected).toEqual([milk]);
  });

  test("a wrong pair stays selected so one can be swapped", () => {
    const state = run([toggle(milk), toggle(coffee), brew]);
    expect(state.feedback).toBe("wrong");
    expect(state.selected).toEqual([milk, coffee]);
  });

  test("the right pair is correct in either order", () => {
    expect(run([toggle(milk), toggle(strawberry), brew]).feedback).toBe(
      "correct",
    );
    expect(run([toggle(strawberry), toggle(milk), brew]).feedback).toBe(
      "correct",
    );
  });

  test("retries are unlimited and wrong answers change nothing else", () => {
    let state = run([toggle(milk), toggle(coffee)]);
    for (let i = 0; i < 100; i++) state = cafeReducer(state, brew);
    expect(state.feedback).toBe("wrong");
    expect(state.order).toEqual(order);
    expect(state.orderNumber).toBe(1);
    expect(
      run([toggle(coffee), toggle(strawberry), brew], state).feedback,
    ).toBe("correct");
  });
});

describe("completing an order", () => {
  const served = run([toggle(milk), toggle(strawberry), brew]);

  test("the mat is locked until the next customer", () => {
    expect(cafeReducer(served, toggle(tea))).toBe(served);
    expect(cafeReducer(served, { type: "clear" })).toBe(served);
    expect(cafeReducer(served, brew)).toBe(served);
  });

  test("next starts a clean order and counts up", () => {
    expect(cafeReducer(served, { type: "next", order: nextOrder })).toEqual({
      order: nextOrder,
      orderNumber: 2,
      selected: [],
      feedback: null,
    });
  });

  test("next does nothing before the drink is correct", () => {
    const wrong = run([toggle(milk), toggle(coffee), brew]);
    expect(cafeReducer(wrong, { type: "next", order: nextOrder })).toBe(wrong);
  });
});

describe("after a JSON round trip", () => {
  const restore = (state: CafeState): CafeState =>
    JSON.parse(JSON.stringify(state));

  test("the state comes back unchanged", () => {
    const state = run([toggle(milk), toggle(coffee), brew]);
    expect(restore(state)).toEqual(state);
    expect(restore(state).selected).toEqual(["milk", "coffee"]);
  });

  test("the right pair still matches, in either order", () => {
    for (const picks of [
      [milk, strawberry],
      [strawberry, milk],
    ]) {
      const restored = restore(run(picks.map(toggle)));
      expect(
        matchesRecipe(restored.selected, recipes["strawberry-milk"]),
      ).toBe(true);
      expect(cafeReducer(restored, brew).feedback).toBe("correct");
    }
  });

  test("a wrong pair is still wrong", () => {
    const restored = restore(run([toggle(milk), toggle(coffee)]));
    expect(cafeReducer(restored, brew).feedback).toBe("wrong");
  });

  test("a restored ingredient can be removed", () => {
    const restored = restore(run([toggle(milk), toggle(tea)]));
    expect(cafeReducer(restored, toggle(milk)).selected).toEqual([tea]);
  });

  test("selecting a restored ingredient doesn't duplicate it", () => {
    const restored = restore(run([toggle(milk)]));
    expect(cafeReducer(restored, toggle(milk)).selected).toEqual([]);
  });

  test("a full restored mug still refuses a third ingredient", () => {
    const restored = restore(run([toggle(milk), toggle(tea)]));
    const state = cafeReducer(restored, toggle(honey));
    expect(state.selected).toEqual([milk, tea]);
    expect(state.feedback).toBe("full");
  });

  test("a restored finished drink stays locked and can move on", () => {
    const restored = restore(run([toggle(milk), toggle(strawberry), brew]));
    expect(cafeReducer(restored, toggle(tea))).toBe(restored);
    expect(
      cafeReducer(restored, { type: "next", order: nextOrder }).orderNumber,
    ).toBe(2);
  });
});
