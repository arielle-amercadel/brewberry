import { useRef, type KeyboardEvent, type MouseEvent } from "react";

/** Long enough to catch a double-press, short enough to feel instant on purpose. */
const HOLD_MS = 500;

/**
 * Stops an accidental second press landing on a button that has just changed
 * meaning, such as Brew becoming Next customer or Buy becoming Unequip.
 */
export function useRepeatGuard() {
  const held = useRef<{ key: string; until: number } | null>(null);

  return {
    /** Call when a press may change what `key`'s button does next. */
    hold: (event: MouseEvent, key: string) => {
      held.current = { key, until: event.timeStamp + HOLD_MS };
    },
    /** True if this press is the second half of a double-click or double-press. */
    isRepeat: (event: MouseEvent, key: string) => {
      // Pointer clicks count themselves. Enter and Space always report 0.
      if (event.detail > 1) return true;
      return (
        event.detail === 0 &&
        held.current?.key === key &&
        event.timeStamp < held.current.until
      );
    },
    /** Stops a held-down Enter or Space, leaving other keys like Tab alone. */
    onKeyDown: (event: KeyboardEvent) => {
      if (event.repeat && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
      }
    },
  };
}
