import type { Ingredient } from "../data/ingredients";
import { Sprite } from "./Sprite";

/** A recipe written as icons, with the names spelled out underneath. */
export function Formula({ items }: { items: Ingredient[] }) {
  return (
    <div className="formula">
      <div className="formula-icons" aria-hidden="true">
        {items.map((item, i) => (
          <span key={item.name} className="contents">
            {i > 0 && <span className="formula-plus">+</span>}
            <Sprite name={item.sprite} pixel={2} />
          </span>
        ))}
      </div>
      <p className="formula-names">
        {items.map((item) => item.name).join(" + ")}
      </p>
    </div>
  );
}
