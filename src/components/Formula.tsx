import { ingredients, type IngredientId } from "../data/ingredients";
import { Sprite } from "./Sprite";

/** A recipe written as icons, with the names spelled out underneath. */
export function Formula({ items }: { items: IngredientId[] }) {
  return (
    <div className="formula">
      <div className="formula-icons" aria-hidden="true">
        {items.map((id, i) => (
          <span key={id} className="contents">
            {i > 0 && <span className="formula-plus">+</span>}
            <Sprite name={ingredients[id].sprite} pixel={2} />
          </span>
        ))}
      </div>
      <p className="formula-names">
        {items.map((id) => ingredients[id].name).join(" + ")}
      </p>
    </div>
  );
}
