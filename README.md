# Brewberry

A cozy pixel-art café game featuring adorable animal customers and drink-making gameplay.

Brewberry looks like a retro handheld cooking game: a strawberry-pink console frame around one game screen, with a status bar at the top and three tabs at the bottom. It's built with React, TypeScript, Vite, and Tailwind CSS.

**Current status:** the Day 1 interface is complete, but there is no gameplay yet. Everything on screen is a static preview and resets with the page.

## Screens

The tabs switch between three working screens.

| Screen      | What it shows                                                                                                                                                    | What is placeholder                                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Café        | Mochi the bunny at the counter with a speech bubble, a cat, bear, and frog, an order ticket, and a prep station with six ingredient crates                       | The order is always the same strawberry milk. Crates only react to hover, and the Brew button is disabled            |
| Shop        | A hedgehog shopkeeper and till, and six decorations on shelves with coin prices and "Soon" stamps                                                                | Prices are sample values and nothing can be bought                                                                   |
| Recipe Book | Five numbered, collectible-style drink cards with illustrations and ingredients                                                                                  | Recipes are sample content. Cards only tilt and shine on hover or keyboard focus                                     |

The status bar's 30 coins, Day 1, and 0/5 orders are fixed sample values, marked with a "Preview" tag.

## Completed and planned features

### Completed: Day 1 interface

- Café, Shop, and Recipe Book screens with working tab navigation.
- Original pixel-art sprites generated from editable text grids.
- Pixelify Sans for headings and labels, with a system font for small text and numbers.
- Layouts for desktop and phone, with sprites scaled by whole numbers so pixels stay crisp.
- Blinking, bobbing, steam, and hover animations, which stop when the player's system asks for reduced motion.
- Keyboard focus styles, a skip-to-content link, and alt text on meaningful art.

### Planned: gameplay

None of these are implemented yet:

- Four animal customers with randomized orders.
- Choosing ingredients and brewing, with validation against five drink recipes.
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

The tests don't check how anything looks, so also review changes in a browser:

- Try each tab, and check keyboard focus with the Tab key.
- Check phone and desktop widths. There should be no horizontal scrolling or console errors.
- Turn on your system's reduced-motion setting and confirm the animations stop.

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
  components/           Header, Navigation, Sprite, and Formula
  data/                 Ingredient list
  views/                Café, Shop, and Recipe Book screens
  App.tsx               Console frame and selected screen
  App.test.tsx          Navigation test
  App.content.test.tsx  Screen content tests
  index.css             Tailwind theme, pixel panels, layouts, and animations
  main.tsx              React entry point
public/
  favicon.svg           Generated Brewberry favicon
```

## Art and font licensing

The sprites are original artwork made for Brewberry. Pixelify Sans is licensed under the SIL Open Font License 1.1; see `src/assets/fonts/OFL.txt`.
