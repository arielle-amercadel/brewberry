import { useState, type Dispatch, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import { AnimatedSprite, Sprite } from "../components/Sprite";
import {
  purchaseStatus,
  type CafeAction,
  type CafeState,
} from "../data/cafeGame";
import {
  decorationIds,
  decorations,
  type DecorationId,
} from "../data/decorations";
import { useRepeatGuard } from "../hooks/useRepeatGuard";

const GREETING = "Welcome! Serve drinks to earn coins.";

/** Decorations the Café can't fit on narrow screens, matching CafeView. */
const hideNoteFrom: Partial<Record<DecorationId, string>> = {
  "strawberry-planter": "md:hidden",
  "cozy-cushion": "min-[360px]:hidden",
};

export function ShopView({
  game,
  dispatch,
}: {
  game: CafeState;
  dispatch: Dispatch<CafeAction>;
}) {
  const [speech, setSpeech] = useState(GREETING);
  const [speechAbout, setSpeechAbout] = useState<DecorationId | null>(null);
  // The new balance after a purchase. The header shows it; this says it aloud.
  const [balance, setBalance] = useState<string | null>(null);
  const speechNote = speechAbout && hideNoteFrom[speechAbout];
  const guard = useRepeatGuard();

  const onItemButton = (event: MouseEvent, id: DecorationId) => {
    // A double-press on Buy must not immediately take the new item back down.
    if (guard.isRepeat(event, id)) return;
    const { name } = decorations[id];
    const button = event.currentTarget;
    flushSync(() => {
      setSpeechAbout(id);
      if (!game.owned.includes(id)) {
        guard.hold(event, id);
        dispatch({ type: "buy", decorationId: id });
        setSpeech(`Thanks! Enjoy your ${name}.`);
        setBalance(`You have ${game.coins - decorations[id].price} coins left.`);
        return;
      }
      setBalance(null);
      dispatch({ type: "toggleEquip", decorationId: id });
      setSpeech(
        game.equipped.includes(id)
          ? `${name} is put away.`
          : `${name} is out in the café.`,
      );
    });
    // A longer message can push this button down, and Safari won't follow it.
    button.scrollIntoView?.({ block: "nearest" });
  };

  return (
    <div className="shop">
      <div className="tile-awning scene-awning" />
      <div className="shop-hero">
        <div className="hanging-sign">
          <h2 tabIndex={-1} className="sign-text panel panel-wood">
            The cozy shop
          </h2>
        </div>
        <div className="keeper">
          <div className="bubble-side panel panel-cream">
            <p role="status">
              {speech}
              {speechNote && game.equipped.includes(speechAbout) && (
                <span className={speechNote}> It shows on larger screens.</span>
              )}
              {balance && <span className="sr-only"> {balance}</span>}
            </p>
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
        {decorationIds.map((id) => {
          const item = decorations[id];
          const status = purchaseStatus(game, id);
          const note = hideNoteFrom[id];
          const shortNote = `need-${id}`;
          const action =
            status !== "owned"
              ? "Buy"
              : game.equipped.includes(id)
                ? "Unequip"
                : "Equip";
          return (
            <li key={id} className="shelf-item">
              <div className="shelf-art">
                <Sprite name={item.sprite} className="shelf-sprite" />
                <Sprite name="sparkle" className="shelf-sparkle" />
              </div>
              <div className="tile-shelf shelf-plank" />
              <div className="shelf-tag panel panel-cream">
                <h3 className="shelf-name">{item.name}</h3>
                <div className="shelf-row">
                  {status === "owned" ? (
                    <span className="stamp">Owned</span>
                  ) : (
                    <span className="price">
                      <Sprite name="coin" pixel={1} />
                      <strong>{item.price}</strong>
                      <span className="sr-only">coins</span>
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={`${action} ${item.name}`}
                    disabled={status === "short"}
                    aria-describedby={status === "short" ? shortNote : undefined}
                    className={`shelf-button panel ${status === "owned" ? "" : "shelf-button-buy"}`}
                    onClick={(event) => onItemButton(event, id)}
                    onKeyDown={guard.onKeyDown}
                  >
                    {action}
                  </button>
                </div>
                {status === "short" && (
                  <p id={shortNote} className="shelf-note">
                    Need {item.price - game.coins} more coins
                  </p>
                )}
                {note && (
                  <p className={`shelf-note ${note}`}>
                    Shows on larger screens
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
