import { decorations, type DecorationId } from "./decorations";
import type { IngredientId } from "./ingredients";
import type { Order } from "./orders";
import { recipes, type Recipe } from "./recipes";

/** The mat has two slots, which fits every recipe. */
export const SLOT_COUNT = 2;

export const STARTING_COINS = 30;
export const ORDER_REWARD = 10;

export type Feedback = "full" | "incomplete" | "wrong" | "correct" | null;

/** Holds only plain ids and values, so it survives a JSON round trip. */
export type CafeState = {
  order: Order;
  orderNumber: number;
  selected: IngredientId[];
  /** The order is complete when this is "correct". */
  feedback: Feedback;
  coins: number;
  owned: DecorationId[];
  /** Always a subset of `owned`. */
  equipped: DecorationId[];
};

export type CafeAction =
  | { type: "toggle"; ingredientId: IngredientId }
  | { type: "clear" }
  | { type: "brew" }
  /** The next order is created by the caller, because reducers must be pure. */
  | { type: "next"; order: Order }
  | { type: "buy"; decorationId: DecorationId }
  | { type: "toggleEquip"; decorationId: DecorationId };

export function createCafeState(order: Order): CafeState {
  return {
    order,
    orderNumber: 1,
    selected: [],
    feedback: null,
    coins: STARTING_COINS,
    owned: [],
    equipped: [],
  };
}

/** True when the selection holds exactly the recipe's ingredients, in any order. */
export function matchesRecipe(
  selected: IngredientId[],
  recipe: Recipe,
): boolean {
  return (
    selected.length === recipe.items.length &&
    recipe.items.every((item) => selected.includes(item))
  );
}

function brew(state: CafeState): CafeState {
  if (state.selected.length === 0) return state;
  if (state.selected.length < SLOT_COUNT) {
    return { ...state, feedback: "incomplete" };
  }
  if (!matchesRecipe(state.selected, recipes[state.order.recipeId])) {
    return { ...state, feedback: "wrong" };
  }
  // The only place coins are earned. A finished order can't reach here again.
  return {
    ...state,
    feedback: "correct",
    coins: state.coins + ORDER_REWARD,
  };
}

export type PurchaseStatus = "owned" | "short" | "available";

export function purchaseStatus(
  state: CafeState,
  id: DecorationId,
): PurchaseStatus {
  if (state.owned.includes(id)) return "owned";
  return state.coins < decorations[id].price ? "short" : "available";
}

export function cafeReducer(state: CafeState, action: CafeAction): CafeState {
  const done = state.feedback === "correct";

  switch (action.type) {
    case "toggle": {
      if (done) return state;
      const { ingredientId } = action;
      if (state.selected.includes(ingredientId)) {
        return {
          ...state,
          selected: state.selected.filter((id) => id !== ingredientId),
          feedback: null,
        };
      }
      if (state.selected.length === SLOT_COUNT) {
        return { ...state, feedback: "full" };
      }
      return {
        ...state,
        selected: [...state.selected, ingredientId],
        feedback: null,
      };
    }
    case "clear":
      return done ? state : { ...state, selected: [], feedback: null };
    case "brew":
      return done ? state : brew(state);
    case "next":
      if (!done) return state;
      return {
        ...state,
        order: action.order,
        orderNumber: state.orderNumber + 1,
        selected: [],
        feedback: null,
      };
    case "buy": {
      const id = action.decorationId;
      if (purchaseStatus(state, id) !== "available") return state;
      return {
        ...state,
        coins: state.coins - decorations[id].price,
        owned: [...state.owned, id],
        equipped: [...state.equipped, id],
      };
    }
    case "toggleEquip": {
      const id = action.decorationId;
      if (!state.owned.includes(id)) return state;
      return {
        ...state,
        equipped: state.equipped.includes(id)
          ? state.equipped.filter((item) => item !== id)
          : [...state.equipped, id],
      };
    }
  }
}
