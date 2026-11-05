import type { IngredientId } from "./ingredients";
import type { Order } from "./orders";
import { recipes, type Recipe } from "./recipes";

/** The mat has two slots, which fits every recipe. */
export const SLOT_COUNT = 2;

export type Feedback = "full" | "incomplete" | "wrong" | "correct" | null;

/** Holds only plain ids and values, so it survives a JSON round trip. */
export type CafeState = {
  order: Order;
  orderNumber: number;
  selected: IngredientId[];
  /** The order is complete when this is "correct". */
  feedback: Feedback;
};

export type CafeAction =
  | { type: "toggle"; ingredientId: IngredientId }
  | { type: "clear" }
  | { type: "brew" }
  /** The next order is created by the caller, because reducers must be pure. */
  | { type: "next"; order: Order };

export function createCafeState(order: Order): CafeState {
  return { order, orderNumber: 1, selected: [], feedback: null };
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
  return {
    ...state,
    feedback: matchesRecipe(state.selected, recipes[state.order.recipeId])
      ? "correct"
      : "wrong",
  };
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
        order: action.order,
        orderNumber: state.orderNumber + 1,
        selected: [],
        feedback: null,
      };
  }
}
