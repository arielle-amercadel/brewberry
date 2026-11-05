# Brewberry development notes

Technical details for working on Brewberry. For an overview of the game, see the [README](../README.md).

## Architecture

| Area | Where | Notes |
| --- | --- | --- |
| Game rules | `src/data/cafeGame.ts` | A reducer: selecting, brewing, serving, buying, equipping, days, and Start over |
| Game content | `src/data/` | Ingredients, recipes, customers, decorations, and order generation |
| Saving | `src/data/save.ts` | Versioned saves, validation, revisions, and storage failure handling |
| One active tab | `src/data/tabLock.ts` | Web Locks and BroadcastChannel |
| App shell | `src/App.tsx` | Holds game state, saves each change, switches screens, and moves focus |
| Screens | `src/views/` | Café, Shop, Recipe Book, Day Complete, and tab notices |

The game state stores IDs and numbers only (customer, recipe, ingredients, decorations, coins, day, and orders served), so it saves as plain JSON. `App.tsx` owns the state, so selections and messages survive switching screens.

**Rules worth knowing:**

- Players start with 30 coins and earn 10 per correct drink. Buying every decoration costs 150 coins, which takes 12 orders.
- Each day has 5 orders. The next order always comes from a different customer.
- Wrong drinks never cost anything, and players can retry as often as they like.
- Refreshing always opens the Café. A brand-new game is first saved on its first action, so refreshing an untouched new game may show a different first order.

## Saving

Progress is written to `localStorage` after every change, under the `brewberry-save` key:

```json
{ "version": 1, "revision": 12, "state": { "...": "..." } }
```

- **Validation.** `parseSave` checks every field: types, known IDs (own keys only, so names like `constructor` are rejected), counts, and whether the fields agree with each other. For example, a served order must match its recipe, and Day Complete needs five orders.
- **Unreadable saves.** These are never deleted. They're moved to `brewberry-save-unreadable`, or left where they are if that copy can't be written. The player sees a short message and a new game starts.
- **Revisions.** Each save increments `revision`. A newer save is handled in one of two ways:
  - **When writing:** a tab only writes if the stored revision is the one it last saw. If the stored save is newer, the tab doesn't overwrite it. It stops and shows **This tab is out of date** with a Reload button.
  - **Through a `storage` event:** if another tab's save arrives with a higher revision while this tab is the active writer, this tab adopts it and continues from there. This covers a previous tab's last save arriving just after a handover.
- **Duplicate rewards and purchases** are prevented by the reducer, not by revisions. Brewing a served order does nothing, and Buy only works for an affordable decoration that isn't owned. The served and owned state is saved, so the same checks apply after a refresh.
- **Storage failures.** If storage can't be read or written, the game keeps playing in memory and shows a persistent warning, and the footer stops saying progress is saved. A valid save still loads when writes are blocked.
- **Start over.** The reset is written over the save. If that fails, the old save is removed so a refresh can't bring it back. If removal can't be confirmed either, nothing is reset and the player is told.

## One active tab

Only one tab may play and save at a time ([`tabLock.ts`](../src/data/tabLock.ts)):

1. The tab holding the `brewberry-game` Web Lock plays. It only reads the save once it has the lock.
2. Other tabs show **Brewberry is open in another tab** and queue for the lock. When the playing tab closes, the browser hands the lock to the next tab, which loads the latest save.
3. **Play here instead** takes the `brewberry-handoff` lock and posts a takeover message on the `brewberry-tabs` BroadcastChannel. The playing tab stops writing first, then releases the lock. The asking tab keeps the handoff lock until it's playing, so no other waiting tab can jump in first. If the playing tab doesn't answer within 3 seconds (for example, because it's frozen in the background), the player is asked to close it.
4. **Without Web Locks** (plain HTTP, or very old browsers), the game plays but never reads, writes, or deletes the save, and it shows a warning. Without locks, two tabs could otherwise overwrite each other.
5. **If a lock request fails unexpectedly**, the tab shows **Brewberry couldn't open your café** with a Reload button, and stops playing and saving.

## Accessibility implementation

- **Focus.** Opening a screen scrolls to the top and focuses its `<h2>`, so screen readers announce it and the next Tab press goes into it. Returning from the Recipe Book mid-order focuses the Prep station heading instead.
- **Keeping focus in place.** Disabled controls can't hold focus. After **Next customer**, **Clear**, or removing an ingredient, focus moves to an ingredient crate.
- **Live messages.** Brewing results and shop messages use `role="status"`, including screen-reader-only text for the customer's thanks and the new coin balance. Saving problems use `role="alert"`.
- **Headings.** The header's `<h1>` is hidden on tab notice screens, so those screens add a visually hidden one.
- **Repeated presses.** `useRepeatGuard` ignores a second press within 500ms, and held-down Enter or Space, on buttons that change meaning, such as Brew becoming Next customer or Buy becoming Unequip.
- **Sticky tabs in Firefox.** The tabs stick to the bottom of the window. Browsers use `scroll-padding-bottom` to keep focused controls clear of them, but Firefox skips scrolling if the control is already in the window. `Navigation.tsx` fixes this by scrolling a keyboard-focused control that ends up under the tabs.
- **Reduced motion.** All animation is inside `@media (prefers-reduced-motion: no-preference)`.

**Automated scan note.** axe-core reports colour-contrast failures on most text. These are false positives: the pixel panels draw their backgrounds with `border-image`, which axe can't see, so it measures text against the dark console behind them. Measuring the rendered pixels instead, all text meets WCAG AA. The lowest ratio is 4.96:1, for the "Served" and "Owned" stamps.

## Decorations on small screens

Decorations have fixed spots. Some don't fit on narrow screens:

| Decoration | Café | Day Complete |
| --- | --- | --- |
| Berry bunting, Sunny wall print, Sage checkered rug | All widths | All widths |
| Café lamp | All widths | 360px and up |
| Cozy cushion | 360px and up | 390px and up |
| Strawberry planter | 768px and up | 768px and up |

The Shop marks the cushion and planter with "Shows on larger screens" on the widths where the Café hides them. Day Complete has less room because all four customers stand in one row, so it hides decorations rather than overlapping them.

## Editing sprites

All pixel art comes from the text grids in `art/sprites/`. Each character is one pixel, and `art/palette.json` maps characters to colours, with `.` for transparent.

1. Edit a grid, or add a new `.txt` file. Width and height must both be multiples of 4.
2. Run `npm run sprites`. It stops with an error naming the file and row if a grid has uneven rows, the wrong size, or an unknown character.
3. Preview the results by opening `art/preview.html` in a browser. New sprites must also be added to the list in that page.

The script uses only Node built-ins and writes `src/assets/sprites/*.png` (plus `_sheet.png`, a reference sheet), the typed `src/assets/sprites/manifest.ts`, and `public/favicon.svg`. Don't edit these files by hand. `npm run build` doesn't regenerate them, so commit them after running the script. Grids named `panel-*` or `tile-*` are 9-slice frames and tiles used only from CSS, so they stay out of the manifest.

## Testing

```bash
npm run test:run   # Vitest, React Testing Library, user-event, jsdom
npm run lint
npm run build
```

| File | Covers |
| --- | --- |
| `App.test.tsx`, `App.content.test.tsx`, `App.orders.test.tsx` | Screens, their content, and order display |
| `App.brewing.test.tsx` | Selecting, brewing, retrying, and serving |
| `App.shop.test.tsx` | Coins, buying, equipping, balance announcements, and "Need X more coins" |
| `App.navigation.test.tsx` | Focus and scrolling when switching screens, returning to brew, and repeated presses |
| `App.days.test.tsx` | Days, Day Complete and its decorations, refreshing, unreadable saves, and Start over |
| `App.saving.test.tsx` | Save conflicts, playing without Web Locks, failed saves, and resets that can't be confirmed |
| `App.tabs.test.tsx`, `App.handoff.test.tsx` | One active tab, handovers, lock failures, and page headings |
| `components/*.test.tsx` | Prep station states and the sticky-tab focus fix |
| `data/*.test.ts` | Game rules, game content, save validation, and tab-lock ordering |

jsdom has no Web Locks, so `src/test-setup.ts` installs a fake from `src/test-utils/fakeLocks.ts` for every test and clears storage between tests. jsdom also has no layout, and its `:focus-visible` matching is unreliable, so layout and real keyboard behaviour need checking in a browser.

### Manual checks before a release

Release 1.0 was also checked in Firefox and Chromium with Playwright and axe-core. Those scripts aren't part of the repository. To check by hand:

- **Keyboard:** play a full day using only the keyboard. Focus should always be visible and never hidden under the tabs.
- **Widths:** at 320, 360, 375, and 390px, and on desktop, there should be no horizontal scrolling, and nothing clipped on Day Complete with every decoration equipped.
- **Saving:** refresh mid-order, after serving, and on Day Complete. Buy a decoration and refresh. Start over, both cancelled and confirmed.
- **Tabs:** open two tabs, use Play here instead, then close the playing tab.
- **Reduced motion:** turn on the system setting and confirm all animation stops.

## Deployment

Brewberry is a static single-page app with no routes, environment variables, or server.

- **Vercel:** use the detected Vite preset (`npm run build`, output `dist`). Node 24 is selected by `engines` in `package.json`.
- **HTTPS is required for saving** (Web Locks only works in secure contexts). Vercel serves HTTPS by default.
- **Saves belong to one domain.** Each preview deployment URL has its own saves, and moving to a new domain starts players over.

## Known limitations

- Not yet tested in Safari/WebKit or with real screen readers.
- Disabled Buy buttons are skipped by the Tab key. Their reason is attached with `aria-describedby`, so it's read in screen-reader browse mode.
- Start over uses `window.confirm`.
- `npm audit` reports a moderate advisory in `minimatch`, pulled in by the `typescript-eslint` lint tooling. It's development-only and doesn't ship in the game, and the production dependency audit is clean.
