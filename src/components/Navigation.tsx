import { useEffect, useRef } from "react";
import { Sprite } from "./Sprite";

const tabs = [
  { view: "Café", icon: "tab-cafe" },
  { view: "Shop", icon: "tab-shop" },
  { view: "Recipe Book", icon: "tab-book" },
] as const;

export type View = (typeof tabs)[number]["view"];

/** The focus ring is drawn this far outside a control, and must clear the tabs too. */
const FOCUS_RING = 8;

export function Navigation({
  view,
  onNavigate,
}: {
  view: View;
  onNavigate: (view: View) => void;
}) {
  const nav = useRef<HTMLElement>(null);

  // These tabs stick to the bottom of the window, over the page. Browsers are
  // meant to keep focused controls clear of them using scroll-padding, but
  // Firefox doesn't scroll at all if the control is already inside the window,
  // so a tall recipe card could be focused right underneath. This only steps in
  // then, and scrollIntoView does respect the padding.
  useEffect(() => {
    let frame = 0;
    const keepClear = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      // Checked once the browser has finished, or skipped, its own scrolling.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const tabs = nav.current;
        if (!tabs || tabs.contains(target)) return;
        if (document.activeElement !== target) return;
        // Only keyboard focus: a click or tap shouldn't move the page.
        if (!target.matches(":focus-visible")) return;
        const bottom = target.getBoundingClientRect().bottom + FOCUS_RING;
        if (bottom > tabs.getBoundingClientRect().top) {
          target.scrollIntoView?.({ block: "nearest" });
        }
      });
    };
    document.addEventListener("focusin", keepClear);
    return () => {
      document.removeEventListener("focusin", keepClear);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <nav ref={nav} aria-label="Main navigation" className="tabs">
      {tabs.map((tab) => (
        <button
          key={tab.view}
          type="button"
          aria-current={view === tab.view ? "page" : undefined}
          onClick={() => onNavigate(tab.view)}
          className="tab panel"
        >
          <Sprite name={tab.icon} pixel={2} />
          {tab.view}
        </button>
      ))}
    </nav>
  );
}
