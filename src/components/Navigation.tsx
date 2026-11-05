import { Sprite } from "./Sprite";

const tabs = [
  { view: "Café", icon: "tab-cafe" },
  { view: "Shop", icon: "tab-shop" },
  { view: "Recipe Book", icon: "tab-book" },
] as const;

export type View = (typeof tabs)[number]["view"];

export function Navigation({
  view,
  onNavigate,
}: {
  view: View;
  onNavigate: (view: View) => void;
}) {
  return (
    <nav aria-label="Main navigation" className="tabs">
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
