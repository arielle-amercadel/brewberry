import type { SpriteName } from "../assets/sprites/manifest";
import { ingredients, type Ingredient } from "./ingredients";

export type Recipe = {
  name: string;
  sprite: SpriteName;
  /** Background colour of the drink's illustration in the Recipe Book. */
  tint: string;
  items: Ingredient[];
};

export const recipes = {
  "strawberry-milk": {
    name: "Strawberry milk",
    sprite: "strawberry-milk",
    tint: "var(--color-blush)",
    items: [ingredients.milk, ingredients.strawberry],
  },
  "honey-tea": {
    name: "Honey tea",
    sprite: "honey-tea",
    tint: "var(--color-sage)",
    items: [ingredients.tea, ingredients.honey],
  },
  "cafe-latte": {
    name: "Café latte",
    sprite: "cafe-latte",
    tint: "var(--color-honey)",
    items: [ingredients.coffee, ingredients.milk],
  },
  "hot-chocolate": {
    name: "Hot chocolate",
    sprite: "hot-chocolate",
    tint: "var(--color-cream-shadow)",
    items: [ingredients.milk, ingredients.cocoa],
  },
  "berry-tea": {
    name: "Berry tea",
    sprite: "berry-tea",
    tint: "var(--color-pink)",
    items: [ingredients.tea, ingredients.strawberry],
  },
} satisfies Record<string, Recipe>;

export type RecipeId = keyof typeof recipes;

/** Every recipe id, in Recipe Book order. */
export const recipeIds = Object.keys(recipes) as RecipeId[];
