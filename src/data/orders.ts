import { customerIds, type CustomerId } from "./customers";
import { recipeIds, type RecipeId } from "./recipes";

export type Order = { customerId: CustomerId; recipeId: RecipeId };

/** `random` must return a number from 0 up to, but not including, 1. */
function pick<T>(list: T[], random: () => number): T {
  return list[Math.floor(random() * list.length)];
}

export function createOrder(random: () => number = Math.random): Order {
  return {
    customerId: pick(customerIds, random),
    recipeId: pick(recipeIds, random),
  };
}
