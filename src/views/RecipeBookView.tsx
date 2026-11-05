import { Formula } from "../components/Formula";
import { Sprite } from "../components/Sprite";
import { recipeIds, recipes } from "../data/recipes";

export function RecipeBookView() {
  return (
    <div className="book panel panel-pink">
      <div className="book-head">
        <h2 tabIndex={-1} className="sign-text panel panel-berry">
          Your recipe book
        </h2>
        <span className="preview-tag">Preview</span>
      </div>
      <ul className="recipes">
        {recipeIds.map((id, i) => {
          const recipe = recipes[id];
          return (
            <li key={id} className="recipe-slot">
              <article
                tabIndex={0}
                aria-labelledby={`recipe-${id}`}
                className="recipe-card panel panel-cream"
              >
                <p className="recipe-number">No. 0{i + 1}</p>
                <div className="recipe-art" style={{ background: recipe.tint }}>
                  <Sprite name={recipe.sprite} />
                </div>
                <h3 id={`recipe-${id}`} className="recipe-name">
                  {recipe.name}
                </h3>
                <Formula items={recipe.items} />
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
