import type { SpriteName } from "../assets/sprites/manifest";

export type Decoration = { name: string; sprite: SpriteName; price: number };

export const decorations = {
  "strawberry-planter": {
    name: "Strawberry planter",
    sprite: "strawberry-planter",
    price: 20,
  },
  "sage-rug": { name: "Sage checkered rug", sprite: "sage-rug", price: 30 },
  "sunny-print": { name: "Sunny wall print", sprite: "sunny-print", price: 25 },
  "cafe-lamp": { name: "Café lamp", sprite: "cafe-lamp", price: 40 },
  bunting: { name: "Berry bunting", sprite: "bunting", price: 15 },
  "cozy-cushion": { name: "Cozy cushion", sprite: "cozy-cushion", price: 20 },
} satisfies Record<string, Decoration>;

export type DecorationId = keyof typeof decorations;

/** Every decoration id, in shelf order. */
export const decorationIds = Object.keys(decorations) as DecorationId[];
