import type { SpriteName } from "../assets/sprites/manifest";

export type Ingredient = { name: string; sprite: SpriteName };

export const ingredients = {
  milk: { name: "Milk", sprite: "milk" },
  strawberry: { name: "Strawberry", sprite: "strawberry" },
  tea: { name: "Tea", sprite: "tea" },
  coffee: { name: "Coffee", sprite: "coffee" },
  cocoa: { name: "Cocoa", sprite: "cocoa" },
  honey: { name: "Honey", sprite: "honey" },
} satisfies Record<string, Ingredient>;

export type IngredientId = keyof typeof ingredients;

/** Every ingredient id, in prep station order. */
export const ingredientIds = Object.keys(ingredients) as IngredientId[];
