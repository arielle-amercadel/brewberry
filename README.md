# Brewberry

A cozy pixel-art café game featuring adorable animal customers and drink-making gameplay.

Brewberry looks like a retro handheld cooking game: a strawberry-pink console frame around one game screen, with a status bar at the top and three tabs at the bottom. It's built with React, TypeScript, Vite, and Tailwind CSS.

**Current status:** the game is playable from start to finish. Players take orders, look up recipes, make drinks, earn coins, and decorate the café, one in-game day at a time. Progress saves automatically in this browser, with no account or server.

## Screens

The tabs switch between three working screens.

| Screen      | What it does                                                                                                                                      | What is placeholder                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Café        | A customer orders a drink at the counter with the other three nearby. Players pick ingredients from six crates, brew, and serve the next customer | Nothing in the order flow                                 |
| Shop        | A hedgehog shopkeeper and till, and six decorations to buy, then equip or unequip                                                                 | Nothing in the buying flow                                |
| Recipe Book | The five recipes as numbered, collectible-style drink cards with illustrations and ingredients                                                    | Cards only tilt and shine on hover or keyboard focus      |

The status bar shows the real coin balance, in-game day, and orders served today.

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

Saving and validation live in `src/data/save.ts`. The game rules are a reducer in `src/data/cafeGame.ts`. `App.tsx` holds its state, so the order, selected ingredients, and messages all survive `CafeView` unmounting when the player switches tabs. The state stores customer, recipe, ingredient, and decoration IDs rather than objects, so it survives a JSON round trip for future saving.

## Coins and decorations

Players start with 30 coins and earn 10 for each correct drink. Wrong drinks never cost anything, and owning everything takes 12 orders.

| Decoration         | Price | Where it appears in the Café           | Visible from |
| ------------------ | ----- | -------------------------------------- | ------------ |
| Berry bunting      | 15    | Across the wall under the awning       | All widths   |
| Strawberry planter | 20    | Customer row, at the right             | 768px        |
| Cozy cushion       | 20    | Customer row, at the right             | 360px        |
| Sunny wall print   | 25    | On the wall, beside the sign           | All widths   |
| Sage checkered rug | 30    | Runner on the front of the counter     | All widths   |
| Café lamp          | 40    | Customer row, before the counter spot  | All widths   |

The Shop labels the two decorations that don't fit on narrow screens with "Shows on larger screens". Decorations have fixed spots and add to the original café art, so the café looks complete before any purchases.

## Saving

Progress saves to localStorage after every change, under the `brewberry-save` key. It's a versioned copy of the game state with a revision number, so a refresh returns to the same order, selected ingredients, or Day Complete screen, and can't pay a reward or charge for a purchase twice. Refreshing always opens the Café.

Saved data is validated before loading. If it can't be used, the player sees a short message, a new game starts, and the old data is kept under `brewberry-save-unreadable`. A valid save still loads when the browser won't allow writing. Whenever progress can't be saved, at startup or later, a warning stays on screen and the footer stops saying progress is saved. A new game is saved on its first action, so refreshing an untouched new game may start with a different order.

Only one browser tab plays at a time. The Web Locks API (`src/data/tabLock.ts`) gives one tab the `brewberry-game` lock, and only that tab reads or writes the save, after it has the lock. Other tabs show "Brewberry is open in another tab" instead of the game. When the playing tab closes, the browser hands the lock to a waiting tab, which loads the latest save. **Play here instead** asks the playing tab to pause; it stops saving, then releases the lock, so two tabs never save at once. If the playing tab doesn't answer, for example because it's frozen in the background, the player is asked to close it.

Without Web Locks (very old browsers, or pages served over plain HTTP from a network address), the game runs in every tab. A revision check then stops a tab from overwriting newer progress: it shows "This tab is out of date" with a Reload button instead.

Start over in the footer resets all progress after a confirmation. If the reset can't be saved, the old save is removed so a refresh can't bring it back. If it can't be removed either, nothing is reset and the player is told.

## How to play

1. Read the order on the ticket. It names the drink but not the ingredients.
2. Look up the ingredients in the Recipe Book if needed. Your selections stay in place while you switch screens.
3. Select an ingredient crate to move it onto the mat. Select it again, select its slot, or use Clear to take it back.
4. Select Brew when both slots are full. Ingredient order doesn't matter.
5. If it's not right, you'll get a friendly message and can try again as many times as you like. There are no timers or penalties.
6. When it's right, you earn 10 coins, the customer says thanks, and the ticket is stamped "Served". Select Next customer when you're ready, and a different customer places a new order.
7. After the fifth order, select Finish Day to see the day's receipt, then Start Next Day when you're ready. Days are in-game only, so there's no real-world waiting.
8. Spend coins in the Shop. New decorations appear in the Café straight away, and you can unequip or re-equip them in the Shop for free.

## Completed features

### Completed: Day 5 saving and days

- Automatic saving, with validation and safe handling of unreadable saves.
- Five orders per in-game day, a Day Complete screen, and unlimited days.
- Real day and order counts in the status bar, and a Start over option.

### Completed: Day 4 coins and decorations

- A real coin balance, with 10 coins paid exactly once per correct drink.
- Buying the six decorations, with no duplicates and no overspending.
- Owned items, equipping, and unequipping, with each decoration in a fixed Café spot.

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
- `src/App.shop.test.tsx` plays through earning coins, buying, equipping, and keeping progress across screens.
- `src/App.navigation.test.tsx` checks scroll and focus when switching screens, and repeated key presses on Brew and Buy.
- `src/App.days.test.tsx` plays through days, Day Complete, refreshing at each stage, unreadable saves, and starting over.
- `src/App.tabs.test.tsx` checks that one tab plays at a time: startup, handover on close, Play here instead, resets, and startup save failures.
- `src/App.saving.test.tsx` checks the out-of-date backstop without Web Locks, saving that stops working, and Start over when saving fails.
- `src/data/tabLock.test.ts` checks the lock handover order with a fake lock manager in `src/test-utils/fakeLocks.ts`.
- `src/data/save.test.ts` checks save validation, revisions, blocked storage, and corrupted or invalid data.
- `src/data/gameData.test.ts` checks the customers, the recipes, dialogue length, and order generation.
- `src/data/cafeGame.test.ts` checks the game rules, rewards, purchases, equipping, recipe matching, and state restored from JSON.
- `src/components/PrepStation.test.tsx` checks the prep station's buttons and states after restoring from JSON.

The tests don't check how anything looks, so also review changes in a browser:

- Try each tab, and check keyboard focus with the Tab key. Opening a screen should show its top and move focus to its heading.
- Check phone and desktop widths. There should be no horizontal scrolling or console errors.
- Turn on your system's reduced-motion setting and confirm the animations stop.
- Play a few orders, including a wrong drink and a Recipe Book visit partway through.
- Try a whole order using only the keyboard.
- Buy decorations and check the Café and Shop at phone and desktop widths, with several decorations equipped.
- Finish a day, refresh on the Day Complete screen, and start the next day.
- Open Brewberry in two tabs, use Play here instead, then close the playing tab.

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
  components/           Header, Navigation, PrepStation, CustomerSprite, Sprite, Formula
  hooks/                Repeated press guard
  data/                 Ingredients, recipes, customers, orders, decorations, rules,
                        saving, and tests
  views/                Café, Day Complete, Shop, Recipe Book, and tab notice screens
  App.tsx               Console frame, selected screen, and game state
  App.test.tsx          Navigation test
  App.content.test.tsx  Screen content tests
  App.orders.test.tsx   Order display and stability tests
  App.brewing.test.tsx  Gameplay tests
  App.shop.test.tsx     Coin, shop, and decoration tests
  App.navigation.test.tsx  Screen switching and repeated key press tests
  App.days.test.tsx     Day progression, refresh, and save tests
  App.saving.test.tsx   Save failure and backstop tests
  App.tabs.test.tsx     One-active-tab tests
  test-utils/           Fake Web Locks for tests
  test-setup.ts         Clears saved progress between tests
  index.css             Tailwind theme, pixel panels, layouts, and animations
  main.tsx              React entry point
public/
  favicon.svg           Generated Brewberry favicon
```

## Art and font licensing

The sprites are original artwork made for Brewberry. Pixelify Sans is licensed under the SIL Open Font License 1.1; see `src/assets/fonts/OFL.txt`.
