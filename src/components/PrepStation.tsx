import { useRef, type Dispatch, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import {
  ORDER_REWARD,
  SLOT_COUNT,
  type CafeAction,
  type CafeState,
} from "../data/cafeGame";
import { customers } from "../data/customers";
import {
  ingredientIds,
  ingredients,
  type IngredientId,
} from "../data/ingredients";
import { createNextOrder } from "../data/orders";
import { recipes } from "../data/recipes";
import { Sprite } from "./Sprite";

function statusMessage({ order, feedback }: CafeState): string {
  const customer = customers[order.customerId];
  const drink = recipes[order.recipeId].name;
  switch (feedback) {
    case "full":
      return "The mug is full! Remove one first.";
    case "incomplete":
      return "Almost! This drink needs one more ingredient.";
    case "wrong":
      return `Hmm, that's not quite ${drink}. Check the Recipe Book and try again!`;
    case "correct":
      return `${drink} is ready! +${ORDER_REWARD} coins`;
    case null:
      return `${customer.name} would like ${drink}. Check the Recipe Book for ingredients.`;
  }
}

export function PrepStation({
  game,
  dispatch,
}: {
  game: CafeState;
  dispatch: Dispatch<CafeAction>;
}) {
  const { order, selected } = game;
  const done = game.feedback === "correct";
  const customer = customers[order.customerId];
  const recipe = recipes[order.recipeId];

  // Slots and disabled buttons can't keep keyboard focus, so it moves to a crate.
  const crateButtons = useRef(new Map<IngredientId, HTMLButtonElement>());
  const focusCrate = (id: IngredientId) => crateButtons.current.get(id)?.focus();

  const onMainButton = (event: MouseEvent) => {
    if (!done) {
      dispatch({ type: "brew" });
      return;
    }
    // A double-click on Brew must not skip straight past the success message.
    if (event.detail > 1) return;
    // The crates are locked until this update lands, and only then can take focus.
    flushSync(() => dispatch({ type: "next", order: createNextOrder(order) }));
    focusCrate(ingredientIds[0]);
  };

  return (
    <section className="prep panel panel-wood" aria-labelledby="prep">
      <h3 id="prep" className="pixel-heading">
        Prep station
      </h3>
      <div className="prep-layout">
        <ul className="crates">
          {ingredientIds.map((id) => {
            const item = ingredients[id];
            const isSelected = selected.includes(id);
            return (
              <li key={id} className="crate">
                <button
                  type="button"
                  aria-pressed={isSelected}
                  disabled={done}
                  className="crate-button"
                  ref={(button) => {
                    if (button) crateButtons.current.set(id, button);
                    else crateButtons.current.delete(id);
                  }}
                  onClick={() => dispatch({ type: "toggle", ingredientId: id })}
                >
                  <span className="crate-stack">
                    {!isSelected && (
                      <Sprite name={item.sprite} className="crate-item" />
                    )}
                    <Sprite name="crate" className="crate-box" />
                  </span>
                  {item.name}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="brew panel panel-cream">
          <div className="brew-mat">
            {Array.from({ length: SLOT_COUNT }, (_, i) => {
              const id: IngredientId | undefined = selected[i];
              return (
                <div key={i} className="contents">
                  {i > 0 && (
                    <span className="formula-plus" aria-hidden="true">
                      +
                    </span>
                  )}
                  {id ? (
                    <button
                      type="button"
                      aria-label={`Remove ${ingredients[id].name}`}
                      title={`Remove ${ingredients[id].name}`}
                      disabled={done}
                      className="brew-slot"
                      onClick={() => {
                        dispatch({ type: "toggle", ingredientId: id });
                        focusCrate(id);
                      }}
                    >
                      <Sprite name="slot" pixel={2} />
                      <Sprite name={ingredients[id].sprite} pixel={2} />
                    </button>
                  ) : (
                    <span className="brew-slot">
                      <Sprite name="slot" pixel={2} />
                    </span>
                  )}
                </div>
              );
            })}
            <Sprite
              name={done ? recipe.sprite : "empty-mug"}
              alt={done ? `Finished ${recipe.name}` : ""}
            />
          </div>
          <div className="brew-actions">
            <button
              type="button"
              disabled={!done && selected.length === 0}
              className="brew-button panel"
              onClick={onMainButton}
            >
              {done ? "Next customer" : "Brew"}
            </button>
            <button
              type="button"
              disabled={done || selected.length === 0}
              className="brew-clear panel"
              onClick={() => {
                dispatch({ type: "clear" });
                focusCrate(ingredientIds[0]);
              }}
            >
              Clear
            </button>
          </div>
        </div>
        <p role="status" className="brew-message">
          {statusMessage(game)}
          {done && (
            <span className="sr-only">
              {" "}
              {customer.name} says: {customer.thanks}
            </span>
          )}
        </p>
      </div>
    </section>
  );
}
