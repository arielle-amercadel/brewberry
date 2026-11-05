import type { SpriteName } from "../assets/sprites/manifest";
import { AnimatedSprite, Sprite } from "../components/Sprite";

const stock: { name: string; sprite: SpriteName; price: number }[] = [
  { name: "Strawberry planter", sprite: "strawberry-planter", price: 20 },
  { name: "Sage checkered rug", sprite: "sage-rug", price: 30 },
  { name: "Sunny wall print", sprite: "sunny-print", price: 25 },
  { name: "Café lamp", sprite: "cafe-lamp", price: 40 },
  { name: "Berry bunting", sprite: "bunting", price: 15 },
  { name: "Cozy cushion", sprite: "cozy-cushion", price: 20 },
];

export function ShopView() {
  return (
    <div className="shop">
      <div className="tile-awning scene-awning" />
      <div className="shop-hero">
        <div className="hanging-sign">
          <h2 className="sign-text panel panel-wood">The cozy shop</h2>
        </div>
        <div className="keeper">
          <div className="bubble-side panel panel-cream">
            <p>New stock soon! Prices are just a preview.</p>
            <Sprite name="bubble-tail" className="bubble-side-tail" />
          </div>
          <AnimatedSprite
            frames={["hedgehog", "hedgehog-blink"]}
            motion="blink"
            alt="Hedgehog shopkeeper"
          />
          <Sprite name="till" />
        </div>
        <div className="scene-counter">
          <div className="tile-counter-top" />
          <div className="tile-counter-front" />
        </div>
      </div>
      <ul className="shelves">
        {stock.map((item) => (
          <li key={item.name} className="shelf-item">
            <div className="shelf-art">
              <Sprite name={item.sprite} className="shelf-sprite" />
              <Sprite name="sparkle" className="shelf-sparkle" />
            </div>
            <div className="tile-shelf shelf-plank" />
            <div className="shelf-tag panel panel-cream">
              <h3 className="shelf-name">{item.name}</h3>
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="price">
                  <Sprite name="coin" pixel={1} />
                  <strong>{item.price}</strong>
                  <span className="sr-only">coins, preview price</span>
                </span>
                <span className="stamp">Soon</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
