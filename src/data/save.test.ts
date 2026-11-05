// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  cafeReducer,
  createCafeState,
  type CafeAction,
  type CafeState,
} from "./cafeGame";
import type { Order } from "./orders";
import {
  BACKUP_KEY,
  clearSave,
  loadGame,
  parseSave,
  parseSaveRecord,
  readSave,
  saveGame,
  SAVE_KEY,
  SAVE_VERSION,
} from "./save";

afterEach(() => {
  vi.restoreAllMocks();
});

const order: Order = { customerId: "mochi", recipeId: "strawberry-milk" };
const next: Order = { customerId: "maple", recipeId: "honey-tea" };
const run = (actions: CafeAction[], start = createCafeState(order)): CafeState =>
  actions.reduce(cafeReducer, start);
const pick = (...ids: ("milk" | "strawberry" | "tea")[]): CafeAction[] =>
  ids.map((ingredientId) => ({ type: "toggle", ingredientId }));
const brew: CafeAction = { type: "brew" };
const serve = [...pick("milk", "strawberry"), brew];

function fiveServed() {
  let state = createCafeState(order);
  for (let i = 0; i < 4; i++) {
    state = run([...serve, { type: "next", order }], state);
  }
  return run(serve, state);
}

const wrap = (state: unknown, version: unknown = SAVE_VERSION) =>
  JSON.stringify({ version, state });
/** A valid save with some fields changed. */
const edit = (changes: Record<string, unknown>) =>
  wrap({ ...createCafeState(order), ...changes });

describe("saving and loading", () => {
  const stages: [string, CafeState][] = [
    ["a new game", createCafeState(order)],
    ["an order in progress", run(pick("milk"))],
    ["a wrong drink", run([...pick("milk", "tea"), brew])],
    ["a served order", run(serve)],
    ["the fifth served order", fiveServed()],
    ["Day Complete", run([{ type: "finishDay" }], fiveServed())],
    [
      "a later day with decorations",
      run(
        [
          { type: "buy", decorationId: "bunting" },
          { type: "finishDay" },
          { type: "startNextDay", order: next },
        ],
        fiveServed(),
      ),
    ],
  ];

  test.each(stages)("%s comes back exactly", (_, state) => {
    expect(saveGame(state, 0)).toEqual({ status: "saved", revision: 1 });
    expect(loadGame()).toEqual({
      state,
      revision: 1,
      problem: null,
      canSave: true,
    });
  });

  test.each(stages)("%s is written with the same text by every tab", (_, state) => {
    expect(JSON.stringify(parseSave(wrap(state)))).toBe(JSON.stringify(state));
  });

  test("the save uses a versioned format", () => {
    saveGame(createCafeState(order), 0);
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY)!);
    expect(saved.version).toBe(1);
    expect(saved.revision).toBe(1);
    expect(saved.state.day).toBe(1);
  });

  test("no save just means a new game", () => {
    expect(loadGame()).toEqual({
      state: null,
      revision: 0,
      problem: null,
      canSave: true,
    });
  });

  test("unknown extra fields aren't kept", () => {
    expect(parseSave(edit({ cheat: true }))).toEqual(createCafeState(order));
  });
});

describe("invalid saves are refused", () => {
  const cases: [string, string][] = [
    ["not JSON", "{oops"],
    ["empty text", ""],
    ["null", "null"],
    ["an array", "[]"],
    ["a number", "7"],
    ["no version", JSON.stringify({ state: createCafeState(order) })],
    ["a newer version", wrap(createCafeState(order), 2)],
    ["an older version", wrap(createCafeState(order), 0)],
    ["a version as text", wrap(createCafeState(order), "1")],
    ["no state", JSON.stringify({ version: 1 })],
    ["null state", wrap(null)],
    ["a missing field", wrap({ day: 1 })],
    ["day 0", edit({ day: 0 })],
    ["a fractional day", edit({ day: 1.5 })],
    ["a day as text", edit({ day: "3" })],
    ["negative orders", edit({ servedToday: -1 })],
    ["six orders", edit({ servedToday: 6 })],
    ["negative coins", edit({ coins: -1 })],
    ["fractional coins", edit({ coins: 1.5 })],
    ["coins as text", edit({ coins: "100" })],
    ["null coins, as NaN is saved", edit({ coins: null })],
    ["dayComplete as text", edit({ dayComplete: "yes" })],
    ["no order", edit({ order: null })],
    ["an unknown customer", edit({ order: { ...order, customerId: "owl" } })],
    ["an unknown recipe", edit({ order: { ...order, recipeId: "soda" } })],
    ["an inherited name as customer", edit({ order: { ...order, customerId: "constructor" } })],
    ["an inherited name as recipe", edit({ order: { ...order, recipeId: "__proto__" } })],
    ["unknown feedback", edit({ feedback: "great" })],
    ["a negative revision", JSON.stringify({ version: 1, revision: -1, state: createCafeState(order) })],
    ["a fractional revision", JSON.stringify({ version: 1, revision: 1.5, state: createCafeState(order) })],
    ["a revision as text", JSON.stringify({ version: 1, revision: "2", state: createCafeState(order) })],
    ["selected isn't a list", edit({ selected: "milk" })],
    ["an unknown ingredient", edit({ selected: ["sugar"] })],
    ["a duplicate ingredient", edit({ selected: ["milk", "milk"] })],
    ["too many ingredients", edit({ selected: ["milk", "tea", "honey"] })],
    ["an inherited name as ingredient", edit({ selected: ["constructor"] })],
    ["an unknown decoration", edit({ owned: ["throne"] })],
    ["an inherited name as decoration", edit({ owned: ["toString"] })],
    ["an inherited name as equipped", edit({ owned: [], equipped: ["hasOwnProperty"] })],
    ["a duplicate purchase", edit({ owned: ["bunting", "bunting"] })],
    ["equipped but not owned", edit({ owned: [], equipped: ["bunting"] })],
    ["a duplicate equip", edit({ owned: ["bunting"], equipped: ["bunting", "bunting"] })],
    ["correct with the wrong drink", edit({ feedback: "correct", servedToday: 1, selected: ["tea", "honey"] })],
    ["correct with no orders served", edit({ feedback: "correct", selected: ["milk", "strawberry"] })],
    ["five orders but none finished", edit({ servedToday: 5 })],
    ["Day Complete after only four", edit({ dayComplete: true, servedToday: 4, feedback: "correct", selected: ["milk", "strawberry"] })],
  ];

  test.each(cases)("%s", (_, raw) => {
    expect(parseSaveRecord(raw)).toBeNull();
  });

  test.each(cases)("%s starts fresh and keeps a backup", (_, raw) => {
    localStorage.setItem(SAVE_KEY, raw);
    expect(loadGame()).toEqual({
      state: null,
      revision: 0,
      problem: "unreadable",
      canSave: true,
    });
    expect(localStorage.getItem(BACKUP_KEY)).toBe(raw);
  });
});

describe("revisions", () => {
  test("saves without a revision count as revision 0", () => {
    expect(parseSaveRecord(wrap(createCafeState(order)))?.revision).toBe(0);
  });

  test("each save goes up by one", () => {
    expect(saveGame(createCafeState(order), 0)).toEqual({ status: "saved", revision: 1 });
    expect(saveGame(run(pick("milk")), 1)).toEqual({ status: "saved", revision: 2 });
    expect(readSave()).toEqual({ state: run(pick("milk")), revision: 2 });
  });

  test("a save from another tab since the last sync is a conflict, and nothing is written", () => {
    saveGame(createCafeState(order), 0);
    saveGame(run(serve), 1); // the other tab
    const before = localStorage.getItem(SAVE_KEY);
    expect(saveGame(run(pick("tea")), 1)).toEqual({
      status: "conflict",
      saved: { state: run(serve), revision: 2 },
    });
    expect(localStorage.getItem(SAVE_KEY)).toBe(before);
  });

  test("force writes over a newer save, with a higher revision", () => {
    saveGame(createCafeState(order), 0);
    saveGame(run(serve), 1);
    expect(saveGame(createCafeState(next), 1, true)).toEqual({ status: "saved", revision: 3 });
    expect(readSave()?.state.order).toEqual(next);
  });

  test("an unreadable save isn't a conflict, so it can be replaced", () => {
    localStorage.setItem(SAVE_KEY, "{bad");
    expect(saveGame(createCafeState(order), 0).status).toBe("saved");
  });
});

describe("storage that doesn't work", () => {
  test("blocked writes are reported, and saving reports failure without throwing", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(loadGame()).toEqual({
      state: null,
      revision: 0,
      problem: null,
      canSave: false,
    });
    expect(saveGame(createCafeState(order), 0)).toEqual({ status: "failed" });
  });

  test("a valid save still loads when writes are blocked", () => {
    saveGame(run(serve), 0);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(loadGame()).toEqual({
      state: run(serve),
      revision: 1,
      problem: null,
      canSave: false,
    });
  });

  test("an unreadable save is left alone when it can't be backed up", () => {
    localStorage.setItem(SAVE_KEY, "{bad");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(loadGame()).toMatchObject({ problem: "unreadable", canSave: false });
    expect(localStorage.getItem(SAVE_KEY)).toBe("{bad");
  });

  test("blocked reads start fresh and can't save", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(loadGame()).toEqual({
      state: null,
      revision: 0,
      problem: null,
      canSave: false,
    });
    expect(readSave()).toBeNull();
    expect(saveGame(createCafeState(order), 0)).toEqual({ status: "failed" });
  });

  test("a save still loads when it can be read and written", () => {
    saveGame(run(serve), 0);
    expect(loadGame()).toMatchObject({ problem: null, canSave: true });
    expect(localStorage.getItem(`${BACKUP_KEY}-test`)).toBeNull();
  });
});

describe("clearing the save", () => {
  test("removes it", () => {
    saveGame(run(serve), 0);
    expect(clearSave()).toBe(true);
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  });

  test("reports when the old save is still there", () => {
    saveGame(run(serve), 0);
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(clearSave()).toBe(false);
  });

  test("isn't counted as cleared when that can't be checked", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(clearSave()).toBe(false);
  });

  test("isn't counted as cleared when removal leaves the save behind", () => {
    saveGame(run(serve), 0);
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {});
    expect(clearSave()).toBe(false);
  });
});
