import type { SpriteName } from "../assets/sprites/manifest";
import { Formula } from "../components/Formula";
import { ingredients, type Ingredient } from "../data/ingredients";
import { Sprite } from "../components/Sprite";

const recipes: {
  name: string;
  sprite: SpriteName;
  tint: string;
  items: Ingredient[];
}[] = [
  {
    name: "Strawberry milk",
    sprite: "strawberry-milk",
    tint: "var(--color-blush)",
    items: [ingredients.milk, ingredients.strawberry],
  },
  {
    name: "Honey tea",
    sprite: "honey-tea",
    tint: "var(--color-sage)",
    items: [ingredients.tea, ingredients.honey],
  },
  {
    name: "Café latte",
    sprite: "cafe-latte",
    tint: "var(--color-honey)",
    items: [ingredients.coffee, ingredients.milk],
  },
  {
    name: "Hot chocolate",
    sprite: "hot-chocolate",
    tint: "var(--color-cream-shadow)",
    items: [ingredients.milk, ingredients.cocoa],
  },
  {
    name: "Berry tea",
    sprite: "berry-tea",
    tint: "var(--color-pink)",
    items: [ingredients.tea, ingredients.strawberry],
  },
];

export function RecipeBookView() {
  return (
    <div className="book panel panel-pink">
      <div className="book-head">
        <h2 className="sign-text panel panel-berry">Your recipe book</h2>
        <span className="preview-tag">Preview</span>
      </div>
      <ul className="recipes">
        {recipes.map((recipe, i) => (
          <li key={recipe.name} className="recipe-slot">
            <article
              tabIndex={0}
              aria-labelledby={`recipe-${i}`}
              className="recipe-card panel panel-cream"
            >
              <p className="recipe-number">No. 0{i + 1}</p>
              <div className="recipe-art" style={{ background: recipe.tint }}>
                <Sprite name={recipe.sprite} />
              </div>
              <h3 id={`recipe-${i}`} className="recipe-name">
                {recipe.name}
              </h3>
              <Formula items={recipe.items} />
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
