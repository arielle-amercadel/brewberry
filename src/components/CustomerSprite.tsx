import { customers, type CustomerId } from "../data/customers";
import { AnimatedSprite } from "./Sprite";

export function CustomerSprite({
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
