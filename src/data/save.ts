import {
  matchesRecipe,
  ORDERS_PER_DAY,
  SLOT_COUNT,
  type CafeState,
  type Feedback,
} from "./cafeGame";
import { customers, type CustomerId } from "./customers";
import { decorations, type DecorationId } from "./decorations";
import { ingredients, type IngredientId } from "./ingredients";
import { recipes, type RecipeId } from "./recipes";

export const SAVE_KEY = "brewberry-save";
/** Keeps a save that couldn't be loaded, rather than destroying it. */
export const BACKUP_KEY = "brewberry-save-unreadable";
export const SAVE_VERSION = 1;

const FEEDBACK: Feedback[] = ["full", "incomplete", "wrong", "correct", null];

const isCount = (value: unknown, min: number): value is number =>
  Number.isSafeInteger(value) && (value as number) >= min;

/** A list of unique ids from `table`. Own keys only, so "constructor" fails. */
function isIdList<T extends string>(
  value: unknown,
  table: Record<T, unknown>,
): value is T[] {
  return (
    Array.isArray(value) &&
    new Set(value).size === value.length &&
    value.every(
      (id) => typeof id === "string" && Object.hasOwn(table, id),
    )
  );
}

/** Returns the saved game, or null if it can't be trusted for any reason. */
export function parseSave(raw: string): CafeState | null {
  let save: unknown;
  try {
    save = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof save !== "object" || save === null) return null;
  const { version, state } = save as { version?: unknown; state?: unknown };
  if (version !== SAVE_VERSION) return null;
  if (typeof state !== "object" || state === null) return null;

  const s = state as Record<keyof CafeState, unknown>;
  const order = s.order as { customerId?: unknown; recipeId?: unknown } | null;
  if (typeof order !== "object" || order === null) return null;
  const { customerId, recipeId } = order;

  if (
    !isCount(s.day, 1) ||
    !isCount(s.servedToday, 0) ||
    s.servedToday > ORDERS_PER_DAY ||
    typeof s.dayComplete !== "boolean" ||
    !isCount(s.coins, 0) ||
    typeof customerId !== "string" ||
    !Object.hasOwn(customers, customerId) ||
    typeof recipeId !== "string" ||
    !Object.hasOwn(recipes, recipeId) ||
    !FEEDBACK.includes(s.feedback as Feedback) ||
    !isIdList<IngredientId>(s.selected, ingredients) ||
    s.selected.length > SLOT_COUNT ||
    !isIdList<DecorationId>(s.owned, decorations) ||
    !isIdList<DecorationId>(s.equipped, decorations)
  ) {
    return null;
  }
  const { owned, selected } = s;
  if (!s.equipped.every((id) => owned.includes(id))) return null;

  // The parts must also agree with each other, or the game could get stuck.
  const done = s.feedback === "correct";
  const recipe = recipes[recipeId as RecipeId];
  if (done && (s.servedToday === 0 || !matchesRecipe(selected, recipe))) {
    return null;
  }
  if (s.servedToday === ORDERS_PER_DAY && !done) return null;
  if (s.dayComplete && s.servedToday !== ORDERS_PER_DAY) return null;

  // Same key order as createCafeState, so tabs write identical text.
  return {
    day: s.day,
    servedToday: s.servedToday,
    dayComplete: s.dayComplete,
    order: {
      customerId: customerId as CustomerId,
      recipeId: recipeId as RecipeId,
    },
    selected,
    feedback: s.feedback as Feedback,
    coins: s.coins,
    owned,
    equipped: s.equipped,
  };
}

/** A saved game, and how many times it has been saved across all tabs. */
export type SavedGame = { state: CafeState; revision: number };

/** Like parseSave, and also reads the revision. Saves without one count as 0. */
export function parseSaveRecord(raw: string): SavedGame | null {
  const state = parseSave(raw);
  if (!state) return null;
  const { revision = 0 } = JSON.parse(raw) as { revision?: unknown };
  return isCount(revision, 0) ? { state, revision } : null;
}

/** The current save, or null if there isn't a usable one. Never throws. */
export function readSave(): SavedGame | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw === null ? null : parseSaveRecord(raw);
  } catch {
    return null;
  }
}

/** Reading and writing are checked separately: either can work without the other. */
export function loadGame(): {
  state: CafeState | null;
  revision: number;
  problem: "unreadable" | null;
  canSave: boolean;
} {
  let raw: string | null = null;
  // Saving needs to read the current save as well as write it.
  let canSave = true;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    canSave = false;
  }
  try {
    localStorage.setItem(BACKUP_KEY + "-test", "1");
    localStorage.removeItem(BACKUP_KEY + "-test");
  } catch {
    canSave = false;
  }
  if (raw === null) return { state: null, revision: 0, problem: null, canSave };
  const saved = parseSaveRecord(raw);
  if (saved) return { ...saved, problem: null, canSave };
  try {
    localStorage.setItem(BACKUP_KEY, raw);
    // Safely backed up, so the message doesn't come back on the next visit.
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Can't back it up, so leave it where it is.
  }
  return { state: null, revision: 0, problem: "unreadable", canSave };
}

export type SaveResult =
  | { status: "saved"; revision: number }
  /** Another tab saved since this tab last synced. Its save is returned instead. */
  | { status: "conflict"; saved: SavedGame }
  | { status: "failed" };

/**
 * Writes the game only if the save hasn't changed since `expectedRevision`, so
 * one tab can't overwrite newer progress from another. `force` skips that check,
 * for Start Over. Never throws.
 */
export function saveGame(
  state: CafeState,
  expectedRevision: number,
  force = false,
): SaveResult {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const stored = raw === null ? null : parseSaveRecord(raw);
    if (!force && stored && stored.revision !== expectedRevision) {
      return { status: "conflict", saved: stored };
    }
    const revision = Math.max(expectedRevision, stored?.revision ?? 0) + 1;
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ version: SAVE_VERSION, revision, state }),
    );
    return { status: "saved", revision };
  } catch {
    return { status: "failed" };
  }
}

/**
 * Removes the save. True only when storage confirms it is gone: if that can't
 * be checked, the save might come back once storage works again. Never throws.
 */
export function clearSave(): boolean {
  try {
    localStorage.removeItem(SAVE_KEY);
    return localStorage.getItem(SAVE_KEY) === null;
  } catch {
    return false;
  }
}
