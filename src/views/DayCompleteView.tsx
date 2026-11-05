import type { MouseEvent } from "react";
import { CustomerSprite } from "../components/CustomerSprite";
import { Sprite } from "../components/Sprite";
import { ORDER_REWARD, type CafeState } from "../data/cafeGame";
import { customerIds } from "../data/customers";
import { useRepeatGuard } from "../hooks/useRepeatGuard";

const blinkTiming = ["", "anim-late", "anim-later", ""];

export function DayCompleteView({
  game,
  onStartNextDay,
}: {
  game: CafeState;
  onStartNextDay: () => void;
}) {
  const guard = useRepeatGuard();

  const onStart = (event: MouseEvent) => {
    // The second half of a double-click on Finish Day could land here.
    if (!guard.isRepeat(event, "start")) onStartNextDay();
  };

  return (
    <div className="grid gap-2">
      <section className="scene day-scene" aria-label="The café after closing">
        <div className="tile-awning scene-awning" />
        <div className="scene-wall justify-center">
          <div className="hanging-sign">
            <h2 tabIndex={-1} className="sign-text panel panel-wood">
              Day {game.day} Complete!
            </h2>
          </div>
        </div>
        <div className="tile-wainscot scene-wainscot" />
        <div className="scene-customers">
          {customerIds.map((id, i) => (
            <CustomerSprite key={id} id={id} className={blinkTiming[i]} />
          ))}
        </div>
        <div className="scene-counter">
          <div className="tile-counter-top" />
          <div className="tile-counter-front" />
        </div>
      </section>

      <section
        className="day-receipt panel panel-paper"
        aria-labelledby="day-receipt"
      >
        <h3 id="day-receipt" className="pixel-heading">
          Today's receipt
        </h3>
        <dl className="day-totals">
          <div>
            <dt>Customers served</dt>
            <dd>{game.servedToday}</dd>
          </div>
          <div>
            <dt>Coins earned today</dt>
            <dd>+{game.servedToday * ORDER_REWARD}</dd>
          </div>
          <div>
            <dt>Total coins</dt>
            <dd className="flex items-center gap-1">
              <Sprite name="coin" pixel={1} />
              {game.coins}
            </dd>
          </div>
        </dl>
        <button
          type="button"
          className="brew-button panel day-start"
          onClick={onStart}
          onKeyDown={guard.onKeyDown}
        >
          Start Next Day
        </button>
      </section>
    </div>
  );
}
