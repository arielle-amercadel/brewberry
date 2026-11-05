import { ORDERS_PER_DAY } from "../data/cafeGame";
import { Sprite } from "./Sprite";

export function Header({
  coins,
  day,
  servedToday,
}: {
  coins: number;
  day: number;
  servedToday: number;
}) {
  return (
    <header className="status-bar panel panel-wood">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <div className="flex items-center gap-2">
        <Sprite name="logo" pixel={2} />
        <h1 className="brand-title">Brewberry</h1>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="stat">
          <Sprite name="coin" pixel={1} />
          <strong>{coins}</strong>
          <span className="sr-only">coins</span>
        </p>
        <ul className="flex flex-wrap items-center gap-2" aria-label="Day and orders">
          <li className="stat">Day {day}</li>
          <li className="stat">
            <span className="hidden gap-[2px] sm:flex" aria-hidden="true">
              {Array.from({ length: ORDERS_PER_DAY }, (_, i) => (
                <Sprite
                  key={i}
                  name={i < servedToday ? "pip-full" : "pip"}
                  pixel={1}
                />
              ))}
            </span>
            Orders{" "}
            <strong>
              {servedToday}/{ORDERS_PER_DAY}
            </strong>
          </li>
        </ul>
      </div>
    </header>
  );
}
