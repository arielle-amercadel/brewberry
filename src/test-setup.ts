import { afterEach, beforeEach } from "vitest";
import { installFakeLocks } from "./test-utils/fakeLocks";

// jsdom has no Web Locks. Without them the game wouldn't save, so every test
// gets a fresh fake. Tests of the no-locks fallback remove it.
let locks: ReturnType<typeof installFakeLocks> | null = null;
beforeEach(() => {
  if (typeof window !== "undefined") locks = installFakeLocks();
});

// The game autosaves, so one test's progress must not leak into the next.
afterEach(() => {
  locks?.uninstall();
  locks = null;
  if (typeof window !== "undefined") window.localStorage.clear();
});
