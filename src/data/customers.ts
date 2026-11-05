import type { SpriteName } from "../assets/sprites/manifest";

export type Customer = {
  name: string;
  species: string;
  sprite: SpriteName;
  blinkSprite: SpriteName;
  /** What the customer says when ordering. Keep it short enough for the bubble. */
  request: (drink: string) => string;
  /** What the customer says after receiving the right drink. */
  thanks: string;
};

export const customers = {
  mochi: {
    name: "Mochi",
    species: "bunny",
    sprite: "mochi",
    blinkSprite: "mochi-blink",
    request: (drink) => `${drink}, please!`,
    thanks: "Yum, thank you!",
  },
  biscuit: {
    name: "Biscuit",
    species: "cat",
    sprite: "cat",
    blinkSprite: "cat-blink",
    request: (drink) => `${drink}, purr-lease!`,
    thanks: "Purr-fect!",
  },
  maple: {
    name: "Maple",
    species: "bear",
    sprite: "bear",
    blinkSprite: "bear-blink",
    request: (drink) => `${drink}? Bear-y nice!`,
    thanks: "Bear-y tasty!",
  },
  matcha: {
    name: "Matcha",
    species: "frog",
    sprite: "frog",
    blinkSprite: "frog-blink",
    request: (drink) => `${drink}? Ribbit!`,
    thanks: "Ribbit-ing!",
  },
} satisfies Record<string, Customer>;

export type CustomerId = keyof typeof customers;

/** Every customer id, in the order background spots are filled. */
export const customerIds = Object.keys(customers) as CustomerId[];
