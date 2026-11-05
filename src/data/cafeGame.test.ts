import { describe, expect, test } from "vitest";
import {
  cafeReducer,
  createCafeState,
  matchesRecipe,
  ORDER_REWARD,
  purchaseStatus,
  STARTING_COINS,
  SLOT_COUNT,
  type CafeAction,
  type CafeState,
} from "./cafeGame";
import { decorationIds, decorations, type DecorationId } from "./decorations";
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
      ...served,
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

const buy = (decorationId: DecorationId): CafeAction => ({
  type: "buy",
  decorationId,
});
const toggleEquip = (decorationId: DecorationId): CafeAction => ({
  type: "toggleEquip",
  decorationId,
});
const withCoins = (coins: number): CafeState => ({
  ...createCafeState(order),
  coins,
});
const serve: CafeAction[] = [toggle(milk), toggle(strawberry), brew];

describe("earning coins", () => {
  test("players start with 30 coins and nothing owned", () => {
    const state = createCafeState(order);
    expect(state.coins).toBe(30);
    expect(STARTING_COINS).toBe(30);
    expect(state.owned).toEqual([]);
    expect(state.equipped).toEqual([]);
  });

  test("a correct drink pays exactly 10", () => {
    expect(ORDER_REWARD).toBe(10);
    expect(run(serve).coins).toBe(40);
  });

  test("brewing a finished order again pays nothing more", () => {
    let state = run(serve);
    for (let i = 0; i < 10; i++) state = cafeReducer(state, brew);
    expect(state.coins).toBe(40);
  });

  test("wrong and incomplete attempts never change coins", () => {
    let state = run([toggle(milk), brew]);
    expect(state.coins).toBe(30);
    state = run([toggle(coffee), brew], state);
    expect(state.feedback).toBe("wrong");
    for (let i = 0; i < 20; i++) state = cafeReducer(state, brew);
    expect(state.coins).toBe(30);
  });

  test("a few wrong tries still pay 10 once the drink is right", () => {
    const state = run([
      toggle(milk),
      toggle(coffee),
      brew,
      brew,
      toggle(coffee),
      toggle(strawberry),
      brew,
    ]);
    expect(state.coins).toBe(40);
  });

  test("moving on neither pays nor loses coins", () => {
    const state = cafeReducer(run(serve), { type: "next", order: nextOrder });
    expect(state.coins).toBe(40);
  });

  test("every order pays once", () => {
    let state = createCafeState(order);
    for (let i = 0; i < 5; i++) {
      state = run(serve, state);
      state = cafeReducer(state, { type: "next", order });
    }
    expect(state.coins).toBe(80);
    expect(state.orderNumber).toBe(6);
  });

  test("the reducer gives the same result when run twice, as StrictMode does", () => {
    const ready = run([toggle(milk), toggle(strawberry)]);
    expect(cafeReducer(ready, brew)).toEqual(cafeReducer(ready, brew));
    expect(ready.coins).toBe(30);
  });
});

describe("buying decorations", () => {
  test.each(decorationIds)("%s costs its listed price", (id) => {
    const { price } = decorations[id];
    expect(cafeReducer(withCoins(100), buy(id)).coins).toBe(100 - price);
  });

  test("buying adds to owned and equips automatically", () => {
    const state = run([buy("bunting")]);
    expect(state.owned).toEqual(["bunting"]);
    expect(state.equipped).toEqual(["bunting"]);
  });

  test("exactly enough coins can buy, leaving zero", () => {
    const state = cafeReducer(withCoins(30), buy("sage-rug"));
    expect(state.coins).toBe(0);
    expect(state.owned).toEqual(["sage-rug"]);
  });

  test("one coin short is refused and changes nothing", () => {
    const start = withCoins(29);
    expect(purchaseStatus(start, "sage-rug")).toBe("short");
    expect(cafeReducer(start, buy("sage-rug"))).toBe(start);
  });

  test("the starting balance can't afford the lamp", () => {
    const start = createCafeState(order);
    expect(cafeReducer(start, buy("cafe-lamp"))).toBe(start);
  });

  test("a second purchase changes nothing, even with coins to spare", () => {
    const owned = cafeReducer(withCoins(100), buy("bunting"));
    expect(purchaseStatus(owned, "bunting")).toBe("owned");
    expect(cafeReducer(owned, buy("bunting"))).toBe(owned);
  });

  test("an owned item that was put away can't be bought again", () => {
    const stored = run([buy("bunting"), toggleEquip("bunting")]);
    expect(cafeReducer(stored, buy("bunting"))).toBe(stored);
  });

  test("buying everything costs 150 and coins never go negative", () => {
    let state = withCoins(150);
    for (const id of decorationIds) state = cafeReducer(state, buy(id));
    expect(state.coins).toBe(0);
    expect(state.owned).toEqual(decorationIds);
    expect(state.equipped).toEqual(decorationIds);
  });

  test("shopping leaves the current drink alone, and works after serving", () => {
    const making = run([toggle(milk), buy("bunting")]);
    expect(making.selected).toEqual([milk]);
    expect(making.order).toEqual(order);
    const served = run([...serve, buy("bunting")]);
    expect(served.feedback).toBe("correct");
    expect(served.coins).toBe(25);
  });
});

describe("equipping decorations", () => {
  const owned = run([buy("bunting")]);

  test("toggling puts an item away and back out", () => {
    const stored = cafeReducer(owned, toggleEquip("bunting"));
    expect(stored.equipped).toEqual([]);
    expect(stored.owned).toEqual(["bunting"]);
    const back = cafeReducer(stored, toggleEquip("bunting"));
    expect(back.equipped).toEqual(["bunting"]);
  });

  test("equipping is free", () => {
    expect(cafeReducer(owned, toggleEquip("bunting")).coins).toBe(owned.coins);
  });

  test("an unowned item can't be equipped", () => {
    expect(cafeReducer(owned, toggleEquip("sage-rug"))).toBe(owned);
  });

  test("all six can be out at once", () => {
    let state = withCoins(150);
    for (const id of decorationIds) state = cafeReducer(state, buy(id));
    expect(state.equipped).toHaveLength(6);
  });

  test("decorations stay equipped through later orders", () => {
    const later = cafeReducer(run(serve, owned), {
      type: "next",
      order: nextOrder,
    });
    expect(later.owned).toEqual(["bunting"]);
    expect(later.equipped).toEqual(["bunting"]);
  });
});

describe("the economy after a JSON round trip", () => {
  const restore = (state: CafeState): CafeState =>
    JSON.parse(JSON.stringify(state));

  test("coins, owned, and equipped come back unchanged", () => {
    const state = run([buy("bunting"), ...serve]);
    expect(restore(state)).toEqual(state);
  });

  test("a restored item still can't be bought twice", () => {
    const restored = restore(run([buy("bunting")]));
    expect(cafeReducer(restored, buy("bunting"))).toBe(restored);
  });

  test("a restored item can still be unequipped", () => {
    const restored = restore(run([buy("bunting")]));
    expect(cafeReducer(restored, toggleEquip("bunting")).equipped).toEqual([]);
  });

  test("a restored finished order doesn't pay again", () => {
    const restored = restore(run(serve));
    expect(cafeReducer(restored, brew).coins).toBe(40);
  });
});
