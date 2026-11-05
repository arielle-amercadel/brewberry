import type { Dispatch } from "react";
import { CustomerSprite } from "../components/CustomerSprite";
import { PrepStation } from "../components/PrepStation";
import { AnimatedSprite, Sprite } from "../components/Sprite";
import { orderNumber, type CafeAction, type CafeState } from "../data/cafeGame";
import { customerIds, customers } from "../data/customers";
import { decorations, type DecorationId } from "../data/decorations";
import { recipes } from "../data/recipes";

export function CafeView({
  game,
  dispatch,
  onFinishDay,
}: {
  game: CafeState;
  dispatch: Dispatch<CafeAction>;
  onFinishDay: () => void;
}) {
  const { order, day, equipped } = game;
  const shows = (id: DecorationId) => equipped.includes(id);
  /** An equipped decoration, sized and placed by its surroundings. */
  const decoration = (id: DecorationId, className = "") =>
    shows(id) && (
      <Sprite
        name={decorations[id].sprite}
        alt={decorations[id].name}
        className={className}
      />
    );
  const done = game.feedback === "correct";
  const customer = customers[order.customerId];
  const recipe = recipes[order.recipeId];
  // The ordering customer takes the counter; the others fill the same three
  // background spots, so an order from Mochi matches the original scene.
  const [firstSeat, secondSeat, standing] = customerIds.filter(
    (id) => id !== order.customerId,
  );

  return (
    <div className="grid gap-2">
      <div className="relative">
        <section className="scene" aria-label="Café counter">
          <div className="tile-awning scene-awning" />
          {shows("bunting") && (
            <div
              role="img"
              aria-label={decorations.bunting.name}
              className="scene-bunting"
            />
          )}
          <div className="scene-wall">
            <Sprite name="window" className="hidden sm:block" />
            {decoration("sunny-print")}
            <div className="hanging-sign">
              <h2
                tabIndex={-1}
                // Tells screen reader players which day has begun.
                aria-label={day > 1 ? `Welcome to the café, Day ${day}` : undefined}
                className="sign-text panel panel-wood"
              >
                Welcome to the café
              </h2>
            </div>
            <div className="wall-shelf hidden md:block">
              <div className="wall-shelf-items">
                <Sprite name="potted-plant" />
                <Sprite name="honey" />
                <Sprite name="milk" />
              </div>
              <Sprite name="wall-shelf" />
            </div>
          </div>
          <div className="tile-wainscot scene-wainscot" />
          <div className="scene-customers">
            <div className="seat">
              <CustomerSprite id={firstSeat} className="seat-guest" />
              <Sprite name="cafe-table" className="seat-table" />
              <span className="seat-drink">
                <AnimatedSprite
                  frames={["steam-1", "steam-2"]}
                  motion="steam"
                  className="seat-steam"
                />
                <Sprite name="mini-mug" />
              </span>
            </div>
            <div className="seat hidden min-[480px]:block">
              <CustomerSprite id={secondSeat} className="seat-guest anim-late" />
              <Sprite name="cafe-table" className="seat-table" />
            </div>
            {decoration("cafe-lamp")}
            <div className="customer">
              <CustomerSprite id={order.customerId} className="bob" />
              <div className="bubble panel panel-cream">
                <p>{done ? customer.thanks : customer.request(recipe.name)}</p>
                <Sprite name="bubble-tail" className="bubble-tail" />
              </div>
            </div>
            <CustomerSprite id={standing} className="anim-later self-end" />
            {decoration("cozy-cushion", "hidden min-[360px]:block")}
            {decoration("strawberry-planter", "hidden md:block")}
          </div>
          <div className="scene-counter">
            <div className="tile-counter-top" />
            <div className="tile-counter-front" />
          </div>
          {decoration("sage-rug", "scene-rug")}
        </section>

        <section className="ticket panel panel-paper" aria-labelledby="ticket">
          <div className="flex items-center justify-between gap-2">
            <h3 id="ticket" className="pixel-heading">
              Order #{String(orderNumber(game)).padStart(2, "0")}
            </h3>
            {done && <span className="stamp">Served</span>}
          </div>
          <div className="ticket-body">
            <Sprite name={recipe.sprite} />
            <div>
              <p className="text-sm">For {customer.name}</p>
              <p className="ticket-drink">{recipe.name}</p>
            </div>
          </div>
        </section>
      </div>

      <PrepStation game={game} dispatch={dispatch} onFinishDay={onFinishDay} />
    </div>
  );
}
