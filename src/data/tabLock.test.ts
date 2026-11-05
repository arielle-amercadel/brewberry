// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { installFakeLocks } from "../test-utils/fakeLocks";
import { startTabLock, tabLocksSupported, type TabLock } from "./tabLock";

let locks: ReturnType<typeof installFakeLocks>;
const started: TabLock[] = [];

beforeEach(() => {
  locks = installFakeLocks();
});
afterEach(() => {
  for (const tab of started.splice(0)) tab.stop();
  locks.uninstall();
});

function tab(name: string, log: string[]) {
  const lock = startTabLock({
    onActive: () => log.push(`${name} active`),
    onWaiting: () => log.push(`${name} waiting`),
    onHandedOff: () => log.push(`${name} stopped`),
    onFailed: () => log.push(`${name} failed`),
  });
  started.push(lock);
  return lock;
}

test("support follows navigator.locks", () => {
  expect(tabLocksSupported()).toBe(true);
  locks.uninstall();
  expect(tabLocksSupported()).toBe(false);
  locks = installFakeLocks();
});

test("tabs started together get exactly one active", async () => {
  const log: string[] = [];
  tab("A", log);
  tab("B", log);
  tab("C", log);
  await vi.waitFor(() => expect(log).toHaveLength(3));
  expect(log.filter((e) => e.endsWith("active"))).toEqual(["A active"]);
  expect(log.filter((e) => e.endsWith("waiting")).sort()).toEqual([
    "B waiting",
    "C waiting",
  ]);
});

test("closing the active tab hands over to the next one waiting", async () => {
  const log: string[] = [];
  const a = tab("A", log);
  tab("B", log);
  await vi.waitFor(() => expect(log).toContain("B waiting"));
  a.stop();
  await vi.waitFor(() => expect(log).toContain("B active"));
});

test("on a takeover, the old tab stops before the new one starts", async () => {
  const log: string[] = [];
  tab("A", log);
  const b = tab("B", log);
  await vi.waitFor(() => expect(log).toContain("B waiting"));
  b.askToPlayHere();
  await vi.waitFor(() => expect(log).toContain("B active"));
  expect(log.indexOf("A stopped")).toBeGreaterThan(-1);
  expect(log.indexOf("A stopped")).toBeLessThan(log.indexOf("B active"));
  expect(locks.isHeld("brewberry-game")).toBe(true);
});

test("the tab that asked gets the lock, even if another waited longer", async () => {
  const log: string[] = [];
  tab("A", log);
  tab("C", log);
  const b = tab("B", log);
  await vi.waitFor(() => expect(log).toContain("B waiting"));
  await vi.waitFor(() => expect(log).toContain("C waiting"));
  b.askToPlayHere();
  await vi.waitFor(() => expect(log).toContain("B active"));
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(log).not.toContain("C active");
});

test("a tab that handed over takes back over when the new one closes", async () => {
  const log: string[] = [];
  tab("A", log);
  const b = tab("B", log);
  await vi.waitFor(() => expect(log).toContain("B waiting"));
  b.askToPlayHere();
  await vi.waitFor(() => expect(log).toContain("B active"));
  b.stop();
  await vi.waitFor(() =>
    expect(log.filter((e) => e === "A active")).toHaveLength(2),
  );
});

test("a frozen tab that doesn't answer keeps the lock: no second writer", async () => {
  const release = locks.holdAsFrozenTab("brewberry-game");
  const log: string[] = [];
  const b = tab("B", log);
  await vi.waitFor(() => expect(log).toContain("B waiting"));
  b.askToPlayHere();
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(log).not.toContain("B active");
  release();
  await vi.waitFor(() => expect(log).toContain("B active"));
});

test("stopping releases the lock and leaves nothing queued", async () => {
  const log: string[] = [];
  const a = tab("A", log);
  const b = tab("B", log);
  await vi.waitFor(() => expect(log).toContain("B waiting"));
  b.stop();
  a.stop();
  await vi.waitFor(() => expect(locks.isHeld("brewberry-game")).toBe(false));
  expect(locks.waitingCount("brewberry-game")).toBe(0);
});

const GAME = "brewberry-game";
const HANDOFF = "brewberry-handoff";
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

test("if the first lock request fails, the tab fails instead of loading forever", async () => {
  locks.failRequests(GAME);
  const log: string[] = [];
  tab("A", log);
  await vi.waitFor(() => expect(log).toEqual(["A failed"]));
  await settle();
  expect(log).toEqual(["A failed"]);
  expect(locks.isHeld(GAME)).toBe(false);
  expect(locks.waitingCount(GAME)).toBe(0);
});

test("if a queued request fails, the waiting tab fails and the playing one is untouched", async () => {
  const log: string[] = [];
  const a = tab("A", log);
  tab("B", log);
  await vi.waitFor(() => expect(log).toContain("B waiting"));
  locks.failQueued(GAME);
  await vi.waitFor(() => expect(log).toContain("B failed"));
  expect(log).not.toContain("A stopped");
  expect(log).not.toContain("A failed");
  // B is out of the queue for good: closing A doesn't open it.
  a.stop();
  await settle();
  expect(log).not.toContain("B active");
  expect(locks.isHeld(GAME)).toBe(false);
});

test("if checking for a handoff fails, the tab fails without playing and lets the lock go", async () => {
  const log: string[] = [];
  const a = tab("A", log);
  tab("B", log);
  await vi.waitFor(() => expect(log).toContain("B waiting"));
  locks.failQuery();
  a.stop();
  await vi.waitFor(() => expect(log).toContain("B failed"));
  expect(log).not.toContain("B active");
  await vi.waitFor(() => expect(locks.isHeld(GAME)).toBe(false));
  expect(locks.waitingCount(GAME)).toBe(0);
});

test("if asking to play here fails, the asking tab fails and leaves the queue", async () => {
  const log: string[] = [];
  tab("A", log);
  const b = tab("B", log);
  await vi.waitFor(() => expect(log).toContain("B waiting"));
  locks.failRequests(HANDOFF);
  b.askToPlayHere();
  await vi.waitFor(() => expect(log).toContain("B failed"));
  expect(log).not.toContain("A stopped");
  expect(locks.isHeld(HANDOFF)).toBe(false);
  expect(locks.waitingCount(GAME)).toBe(0);
});

test("a tab that failed ignores later takeover requests", async () => {
  const log: string[] = [];
  const a = tab("A", log);
  const b = tab("B", log);
  const c = tab("C", log);
  await vi.waitFor(() => expect(log).toContain("C waiting"));
  locks.failQueued(GAME);
  await vi.waitFor(() => expect(log).toContain("B failed"));
  await vi.waitFor(() => expect(log).toContain("C failed"));
  b.askToPlayHere();
  c.askToPlayHere();
  await settle();
  expect(log).not.toContain("A stopped");
  expect(locks.isHeld(HANDOFF)).toBe(false);
  a.stop();
});

test("stopping a tab, which cancels its queued request, isn't a failure", async () => {
  const log: string[] = [];
  const a = tab("A", log);
  const b = tab("B", log);
  await vi.waitFor(() => expect(log).toContain("B waiting"));
  b.stop();
  a.stop();
  await settle();
  expect(log.filter((e) => e.endsWith("failed"))).toEqual([]);
});
