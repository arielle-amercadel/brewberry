import { useReducer, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Header } from "./components/Header";
import { Navigation, type View } from "./components/Navigation";
import { cafeReducer, createCafeState } from "./data/cafeGame";
import { createOrder } from "./data/orders";
import { CafeView } from "./views/CafeView";
import { ShopView } from "./views/ShopView";
import { RecipeBookView } from "./views/RecipeBookView";

export default function App() {
  const [view, setView] = useState<View>("Café");
  // Lives here because CafeView unmounts when the player switches tabs.
  const [game, dispatch] = useReducer(cafeReducer, undefined, () =>
    createCafeState(createOrder()),
  );
  const main = useRef<HTMLElement>(null);

  const navigate = (next: View) => {
    if (next === view) return;
    // The new screen has to exist before focus can move into it.
    flushSync(() => setView(next));
    document.documentElement.scrollTop = 0;
    // Announces the new screen, and the next Tab press goes into it.
    main.current?.querySelector("h2")?.focus({ preventScroll: true });
  };

  return (
    <div className="console panel panel-berry">
      <div className="screen">
        <Header coins={game.coins} />
        <main
          ref={main}
          id="main-content"
          tabIndex={-1}
          className="screen-main"
        >
          {view === "Café" && <CafeView game={game} dispatch={dispatch} />}
          {view === "Shop" && <ShopView game={game} dispatch={dispatch} />}
          {view === "Recipe Book" && <RecipeBookView />}
        </main>
        <Navigation view={view} onNavigate={navigate} />
      </div>
      <footer className="console-footer">
        Brewberry preview · More gameplay coming soon
      </footer>
    </div>
  );
}
