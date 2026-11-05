import { Formula } from "../components/Formula";
import { AnimatedSprite, Sprite } from "../components/Sprite";
import { customerIds, customers, type CustomerId } from "../data/customers";
import { ingredients } from "../data/ingredients";
import type { Order } from "../data/orders";
import { recipes } from "../data/recipes";

const station = [
  ingredients.milk,
  ingredients.strawberry,
  ingredients.tea,
  ingredients.coffee,
  ingredients.cocoa,
  ingredients.honey,
];

function CustomerSprite({
  id,
  className,
}: {
  id: CustomerId;
  className: string;
}) {
  const customer = customers[id];
  return (
    <AnimatedSprite
      frames={[customer.sprite, customer.blinkSprite]}
      motion="blink"
      alt={`${customer.name} the ${customer.species}`}
      className={className}
    />
  );
}

export function CafeView({ order }: { order: Order }) {
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
          <div className="scene-wall">
            <Sprite name="window" className="hidden sm:block" />
            <div className="hanging-sign">
              <h2 className="sign-text panel panel-wood">
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
            <div className="customer">
              <CustomerSprite id={order.customerId} className="bob" />
              <div className="bubble panel panel-cream">
                <p>{customer.request(recipe.name)}</p>
                <Sprite name="bubble-tail" className="bubble-tail" />
              </div>
            </div>
            <CustomerSprite id={standing} className="anim-later self-end" />
          </div>
          <div className="scene-counter">
            <div className="tile-counter-top" />
            <div className="tile-counter-front" />
          </div>
        </section>

        <section className="ticket panel panel-paper" aria-labelledby="ticket">
          <div className="flex items-center justify-between gap-2">
            <h3 id="ticket" className="pixel-heading">
              Order #01
            </h3>
            <span className="preview-tag">Preview</span>
          </div>
          <div className="ticket-body">
            <Sprite name={recipe.sprite} />
            <div>
              <p className="text-sm">For {customer.name}</p>
              <p className="ticket-drink">{recipe.name}</p>
              <Formula items={recipe.items} />
            </div>
          </div>
        </section>
      </div>

      <section className="prep panel panel-wood" aria-labelledby="prep">
        <h3 id="prep" className="pixel-heading">
          Prep station
        </h3>
        <div className="prep-layout">
          <ul className="crates">
            {station.map((item) => (
              <li key={item.name} className="crate">
                <span className="crate-stack">
                  <Sprite name={item.sprite} className="crate-item" />
                  <Sprite name="crate" className="crate-box" />
                </span>
                {item.name}
              </li>
            ))}
          </ul>
          <div className="brew panel panel-cream">
            <div className="brew-mat" aria-hidden="true">
              <Sprite name="slot" pixel={2} />
              <span className="formula-plus">+</span>
              <Sprite name="slot" pixel={2} />
              <Sprite name="empty-mug" />
            </div>
            <button type="button" disabled className="brew-button panel">
              Brew
              <span className="brew-soon">Soon</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
