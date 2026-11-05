# Brewberry

A cozy pixel-art café game featuring adorable animal customers and drink-making gameplay.

Brewberry looks like a retro handheld cooking game: a strawberry-pink console frame around one game screen, with a status bar at the top and three tabs at the bottom. It's built with React, TypeScript, Vite, and Tailwind CSS.

**Current status:** players can take orders, look up recipes, make drinks, and move on to the next customer. Coins, shop purchases, daily limits, and saving aren't built yet, so refreshing the page starts over.

## Screens

The tabs switch between three working screens.

| Screen      | What it does                                                                                                                                      | What is placeholder                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Café        | A customer orders a drink at the counter with the other three nearby. Players pick ingredients from six crates, brew, and serve the next customer | Nothing in the order flow                                 |
| Shop        | A hedgehog shopkeeper and till, and six decorations on shelves with coin prices and "Soon" stamps                                                 | Prices are sample values and nothing can be bought        |
| Recipe Book | The five recipes as numbered, collectible-style drink cards with illustrations and ingredients                                                    | Cards only tilt and shine on hover or keyboard focus      |

The status bar's 30 coins, Day 1, and 0/5 orders are fixed sample values, marked with a "Preview" tag.

## Customers and recipes

| Customer | Animal | Asks for a drink like this |
| -------- | ------ | -------------------------- |
| Mochi    | Bunny  | "{drink}, please!"         |
| Biscuit  | Cat    | "{drink}, purr-lease!"     |
| Maple    | Bear   | "{drink}? Bear-y nice!"    |
| Matcha   | Frog   | "{drink}? Ribbit!"         |

| Drink           | Ingredients        |
| --------------- | ------------------ |
| Strawberry milk | Milk + Strawberry  |
| Honey tea       | Tea + Honey        |
| Café latte      | Coffee + Milk      |
| Hot chocolate   | Milk + Cocoa       |
| Berry tea       | Tea + Strawberry   |

This data lives in `src/data/`, and orders, brewing checks, and the Recipe Book all read from the same recipes. `src/data/orders.ts` creates orders, and always picks a different customer for the next one.

The game rules are a reducer in `src/data/cafeGame.ts`. `App.tsx` holds its state, so the order, selected ingredients, and messages all survive `CafeView` unmounting when the player switches tabs. The state stores customer, recipe, and ingredient IDs rather than objects, so it survives a JSON round trip for future saving.

## How to play

1. Read the order on the ticket. It names the drink but not the ingredients.
2. Look up the ingredients in the Recipe Book if needed. Your selections stay in place while you switch screens.
3. Select an ingredient crate to move it onto the mat. Select it again, select its slot, or use Clear to take it back.
4. Select Brew when both slots are full. Ingredient order doesn't matter.
5. If it's not right, you'll get a friendly message and can try again as many times as you like. There are no timers or penalties.
6. When it's right, the customer says thanks and the ticket is stamped "Served". Select Next customer when you're ready, and a different customer places a new order.

## Completed and planned features

### Completed: Day 3 making drinks

- Selecting and removing ingredients, with two slots and no duplicates.
- Brewing checked against the shared recipes, in any ingredient order.
- Friendly messages for missing or wrong ingredients, with unlimited retries.
- Customer thanks, a "Served" stamp, and a Next customer button, so players set the pace.
- A new order from a different customer after each drink, with the order number counting up.
- Keyboard, touch-target, and screen-reader support for the prep station.

### Completed: Day 2 customers and orders

- Four named customers with their own sprites and dialogue.
- One shared recipe source for the Café and Recipe Book.
- A random order on page load that stays stable while switching screens.
- The ordering customer at the counter, with the other three in the background.

### Completed: Day 1 interface

- Café, Shop, and Recipe Book screens with working tab navigation.
- Original pixel-art sprites generated from editable text grids.
- Pixelify Sans for headings and labels, with a system font for small text and numbers.
- Layouts for desktop and phone, with sprites scaled by whole numbers so pixels stay crisp.
- Blinking, bobbing, steam, and hover animations, which stop when the player's system asks for reduced motion.
- Keyboard focus styles, a skip-to-content link, and alt text on meaningful art.

### Planned: gameplay

None of these are implemented yet:

- Ten coins per correct order, with no timers or penalties for incorrect orders.
- Five orders per café day, and day progression.
- Buying cosmetic decorations and placing them in the café.
- Automatic saving with localStorage.

## Installation

Use Node.js 24 LTS and npm (developed with Node 24.14.0).

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite, usually http://localhost:5173. Stop the server with Ctrl+C.

## Development commands

| Command            | Purpose                                                  |
| ------------------ | -------------------------------------------------------- |
| `npm run dev`      | Start the development server with hot reload             |
| `npm test`         | Run Vitest in watch mode                                 |
| `npm run test:run` | Run tests once                                           |
| `npm run lint`     | Run ESLint on TypeScript files                           |
| `npm run build`    | Type-check and create the production build in `dist/`    |
| `npm run preview`  | Serve the production build locally after building        |
| `npm run sprites`  | Regenerate the PNG sprites and favicon from the grids    |

## Editing sprites

The editable source for all pixel art is the text grids in `art/sprites/`. Each character is one pixel, and `art/palette.json` maps characters to colours, with `.` for transparent.

1. Edit a grid in `art/sprites/`, or add a new `.txt` file. Width and height must both be multiples of 4.
2. Run `npm run sprites`. It stops with an error naming the file and row if a grid has uneven rows, the wrong size, or a character that isn't in the palette.
3. To see the result, run `open art/preview.html` on macOS, or open the file in a browser on other systems. New sprites must also be added to the list in that page.

The command needs no extra packages and writes these files:

- **`src/assets/sprites/*.png`:** one PNG per grid, plus `_sheet.png`, a combined reference sheet.
- **`src/assets/sprites/manifest.ts`:** the typed sprite list used by the `Sprite` component.
- **`public/favicon.svg`:** drawn from the `logo` grid.

Don't edit these by hand, because the next run overwrites them. `npm run build` doesn't regenerate them, so keep the generated files in Git and rerun `npm run sprites` after changing a grid.

Grids named `panel-*` or `tile-*` are 9-slice frames and repeating backgrounds used only from `src/index.css`, so they stay out of the manifest.

## Testing

```bash
npm run test:run
npm run lint
npm run build
```

The tests use Vitest, React Testing Library, user-event, and jsdom:

- `src/App.test.tsx` checks navigation between all three screens.
- `src/App.content.test.tsx` checks that each screen shows its expected content, that Brew is disabled, and that the Shop has no buy buttons.
- `src/App.orders.test.tsx` checks that every customer and drink displays correctly, and that the order stays the same while switching screens.
- `src/App.brewing.test.tsx` plays through selecting, brewing, retrying, serving, the next customer, and switching screens.
- `src/data/gameData.test.ts` checks the customers, the recipes, dialogue length, and order generation.
- `src/data/cafeGame.test.ts` checks the game rules, recipe matching, and state restored from JSON.
- `src/components/PrepStation.test.tsx` checks the prep station's buttons and states after restoring from JSON.

The tests don't check how anything looks, so also review changes in a browser:

- Try each tab, and check keyboard focus with the Tab key.
- Check phone and desktop widths. There should be no horizontal scrolling or console errors.
- Turn on your system's reduced-motion setting and confirm the animations stop.
- Play a few orders, including a wrong drink and a Recipe Book visit partway through.
- Try a whole order using only the keyboard.

## Structure

```text
art/
  palette.json          Colours used by the sprite grids
  preview.html          Sprite preview page (not part of the build)
  sprites/              Editable text grids, the source for all pixel art
scripts/
  build-sprites.mjs     Generates the PNGs, manifest, and favicon
src/
  assets/
    fonts/              Pixelify Sans and its license
    sprites/            Generated PNGs and manifest.ts
  components/           Header, Navigation, PrepStation, Sprite, and Formula
  data/                 Ingredients, recipes, customers, orders, game rules, and tests
  views/                Café, Shop, and Recipe Book screens
  App.tsx               Console frame, selected screen, and game state
  App.test.tsx          Navigation test
  App.content.test.tsx  Screen content tests
  App.orders.test.tsx   Order display and stability tests
  App.brewing.test.tsx  Gameplay tests
  index.css             Tailwind theme, pixel panels, layouts, and animations
  main.tsx              React entry point
public/
  favicon.svg           Generated Brewberry favicon
```

## Art and font licensing

The sprites are original artwork made for Brewberry. Pixelify Sans is licensed under the SIL Open Font License 1.1; see `src/assets/fonts/OFL.txt`.
