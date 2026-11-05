import { useEffect, useRef, useState, type Dispatch } from "react";
import { flushSync } from "react-dom";
import { Header } from "./components/Header";
import { Navigation, type View } from "./components/Navigation";
import {
  cafeReducer,
  createCafeState,
  type CafeAction,
  type CafeState,
} from "./data/cafeGame";
import { createNextOrder, createOrder } from "./data/orders";
import {
  clearSave,
  loadGame,
  readSave,
  saveGame,
  SAVE_KEY,
} from "./data/save";
import { startTabLock, tabLocksSupported, type TabLock } from "./data/tabLock";
import { CafeView } from "./views/CafeView";
import { DayCompleteView } from "./views/DayCompleteView";
import { ShopView } from "./views/ShopView";
import { RecipeBookView } from "./views/RecipeBookView";
import { TabNotice, type TabState } from "./views/TabNotice";

/** Reads the save. Only the tab holding the lock calls this. */
function openSave() {
  const loaded = loadGame();
  return {
    state: loaded.state ?? createCafeState(createOrder()),
    revision: loaded.state ? loaded.revision : null,
    unreadable: loaded.problem === "unreadable",
    canSave: loaded.canSave,
  };
}

export default function App() {
  const [view, setView] = useState<View>("Café");
  // Without Web Locks, tabs can't be kept from overwriting each other, so the
  // game plays without saving and never reads or changes the stored game.
  const [usesLock] = useState(tabLocksSupported);
  const [tab, setTab] = useState<TabState | "active">(
    usesLock ? "checking" : "active",
  );
  const [game, setGame] = useState<CafeState | null>(() =>
    usesLock ? null : createCafeState(createOrder()),
  );
  const [unreadable, setUnreadable] = useState(false);
  const [saving, setSaving] = useState(usesLock);
  const [startOverFailed, setStartOverFailed] = useState(false);
  const [asking, setAsking] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [canAskToPlayHere, setCanAskToPlayHere] = useState(false);
  const main = useRef<HTMLElement>(null);
  const lock = useRef<TabLock | null>(null);

  // The newest state, so several actions in one moment build on each other.
  const latest = useRef(game);
  // The save revision this tab last wrote or loaded. Null before its first save.
  const synced = useRef<number | null>(null);
  // Only the active tab may change the game. Cleared before the lock is handed on.
  const writable = useRef(!usesLock);

  /**
   * Applies a change that opens a new screen, then takes the player to its top,
   * or to the section `landOn` names.
   */
  const showScreen = (change: () => void, landOn?: string) => {
    // The new screen has to exist before focus can move into it.
    flushSync(change);
    document.documentElement.scrollTop = 0;
    const section = landOn ? document.getElementById(landOn) : null;
    // Announces the new screen, and the next Tab press goes into it.
    const heading = section ?? main.current?.querySelector("h2");
    heading?.focus({ preventScroll: true });
    section?.scrollIntoView?.({ block: "start" });
  };

  useEffect(() => {
    if (!usesLock) return;
    let wasWaiting = false;
    const current = startTabLock({
      onActive: () => {
        // The save is only read once this tab holds the lock.
        const save = openSave();
        latest.current = save.state;
        synced.current = save.revision;
        writable.current = true;
        const show = () => {
          setGame(save.state);
          setUnreadable(save.unreadable);
          setSaving(save.canSave);
          setAsking(false);
          setStuck(false);
          setTab("active");
          setView("Café");
        };
        // A tab that was waiting announces the café as it opens.
        if (wasWaiting) showScreen(show);
        else show();
      },
      onWaiting: () => {
        wasWaiting = true;
        setTab((state) => (state === "handedOff" ? state : "waiting"));
      },
      onHandedOff: () => {
        writable.current = false;
        latest.current = null;
        // Shown before the lock is released, so the café is never on screen
        // in two tabs at once.
        flushSync(() => {
          setGame(null);
          setTab("handedOff");
        });
      },
      onFailed: () => {
        // Nothing is known about other tabs any more, so this one stops for good.
        writable.current = false;
        latest.current = null;
        showScreen(() => {
          setGame(null);
          setAsking(false);
          setTab("failed");
        });
      },
    });
    lock.current = current;
    setCanAskToPlayHere(current.canAskToPlayHere);

    // Right after a handover, the previous tab's last save can arrive late.
    // Only one tab writes, so a newer save can only be that one.
    const onStorage = (event: StorageEvent) => {
      if (!writable.current) return;
      if (event.key !== SAVE_KEY && event.key !== null) return;
      const saved = readSave();
      if (saved && saved.revision > (synced.current ?? 0)) {
        latest.current = saved.state;
        synced.current = saved.revision;
        setGame(saved.state);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      writable.current = false;
      current.stop();
    };
  }, [usesLock]);

  /** Stops this tab from writing when another tab has changed the save. */
  const becomeOutdated = () => {
    writable.current = false;
    latest.current = null;
    showScreen(() => {
      setGame(null);
      setTab("outdated");
    });
  };

  // Every change is saved as it happens, from the event that caused it.
  const dispatch: Dispatch<CafeAction> = (action) => {
    const current = latest.current;
    if (!writable.current || !current) return;
    const next = cafeReducer(current, action);
    if (next === current) return;
    if (!usesLock) {
      latest.current = next;
      setGame(next);
      return;
    }
    const result = saveGame(next, synced.current ?? 0);
    if (result.status === "conflict") {
      becomeOutdated();
      return;
    }
    latest.current = next;
    setGame(next);
    if (result.status === "saved") synced.current = result.revision;
    setSaving(result.status === "saved");
  };

  const navigate = (next: View) => {
    if (next === view) return;
    // Back from looking up a recipe mid-order: straight to the ingredients.
    const backToBrewing =
      view === "Recipe Book" &&
      next === "Café" &&
      game !== null &&
      !game.dayComplete &&
      game.feedback !== "correct";
    showScreen(() => setView(next), backToBrewing ? "prep" : undefined);
  };

  const playHere = () => {
    setAsking(true);
    setStuck(false);
    lock.current?.askToPlayHere();
    window.setTimeout(() => setStuck(true), 3000);
  };

  const startOver = () => {
    const current = latest.current;
    if (!writable.current || !current) return;
    const confirmed = window.confirm(
      "Start over? This resets your day, orders, coins, and decorations.",
    );
    if (!confirmed || !writable.current) return;
    const fresh = cafeReducer(current, {
      type: "startOver",
      order: createOrder(),
    });
    if (!usesLock) {
      showScreen(() => {
        setView("Café");
        latest.current = fresh;
        setGame(fresh);
      });
      return;
    }
    // Starting over always replaces the save.
    const result = saveGame(fresh, synced.current ?? 0, true);
    // If the reset can't be saved, the old save must at least be gone, or a
    // refresh would quietly bring the old game back.
    if (result.status !== "saved" && !clearSave()) {
      setStartOverFailed(true);
      return;
    }
    showScreen(() => {
      setView("Café");
      setUnreadable(false);
      setStartOverFailed(false);
      latest.current = fresh;
      synced.current = result.status === "saved" ? result.revision : null;
      setGame(fresh);
      setSaving(result.status === "saved");
    });
  };

  const dismiss = (close: () => void) => showScreen(close);
  const playing = tab === "active" && game !== null;

  return (
    <div className="console panel panel-berry">
      <div className="screen">
        {playing && (
          <Header
            coins={game.coins}
            day={game.day}
            servedToday={game.servedToday}
          />
        )}
        {playing && !usesLock && (
          <div role="alert" className="save-notice panel panel-cream">
            <p>
              This browser can't keep Brewberry's progress safe, so nothing is
              being saved. Progress will be lost when you close this page.
            </p>
          </div>
        )}
        {playing && usesLock && !saving && (
          <div role="alert" className="save-notice panel panel-cream">
            <p>
              Progress isn't being saved right now, so it will be lost when you
              close this page.
            </p>
          </div>
        )}
        {playing && unreadable && (
          <div role="alert" className="save-notice panel panel-cream">
            <p>Your saved café couldn't be opened, so a new one has started.</p>
            <button
              type="button"
              className="shelf-button panel"
              onClick={() => dismiss(() => setUnreadable(false))}
            >
              OK
            </button>
          </div>
        )}
        {playing && startOverFailed && (
          <div role="alert" className="save-notice panel panel-cream">
            <p>
              Couldn't start over, because this browser isn't letting Brewberry
              change its save. Your café is unchanged.
            </p>
            <button
              type="button"
              className="shelf-button panel"
              onClick={() => dismiss(() => setStartOverFailed(false))}
            >
              OK
            </button>
          </div>
        )}
        <main
          ref={main}
          id="main-content"
          tabIndex={-1}
          className="screen-main"
        >
          {/* The header holds the page's main heading. Notice screens hide it,
              so screen readers still get one there. */}
          {!playing && <h1 className="sr-only">Brewberry</h1>}
          {!playing && (
            <TabNotice
              state={tab === "active" ? "checking" : tab}
              asking={asking}
              stuck={stuck}
              canAskToPlayHere={canAskToPlayHere}
              onPlayHere={playHere}
            />
          )}
          {playing &&
            view === "Café" &&
            (game.dayComplete ? (
              <DayCompleteView
                game={game}
                onStartNextDay={() =>
                  showScreen(() =>
                    dispatch({
                      type: "startNextDay",
                      order: createNextOrder(game.order),
                    }),
                  )
                }
              />
            ) : (
              <CafeView
                game={game}
                dispatch={dispatch}
                onFinishDay={() =>
                  showScreen(() => dispatch({ type: "finishDay" }))
                }
              />
            ))}
          {playing && view === "Shop" && (
            <ShopView game={game} dispatch={dispatch} />
          )}
          {playing && view === "Recipe Book" && <RecipeBookView />}
        </main>
        {playing && <Navigation view={view} onNavigate={navigate} />}
      </div>
      <footer className="console-footer">
        <p>
          {!playing
            ? "Brewberry"
            : !usesLock
              ? "Brewberry · Progress isn't saved in this browser"
              : saving
              ? "Brewberry · Progress saves automatically on this browser"
              : "Brewberry · Progress isn't being saved right now"}
        </p>
        {playing && (
          <button type="button" className="start-over" onClick={startOver}>
            Start over
          </button>
        )}
      </footer>
    </div>
  );
}
