import { useState } from "react";
import { Header } from "./components/Header";
import { Navigation, type View } from "./components/Navigation";
import { CafeView } from "./views/CafeView";
import { ShopView } from "./views/ShopView";
import { RecipeBookView } from "./views/RecipeBookView";

export default function App() {
  const [view, setView] = useState<View>("Café");
  return (
    <div className="console panel panel-berry">
      <div className="screen">
        <Header />
        <main id="main-content" tabIndex={-1} className="screen-main">
          {view === "Café" && <CafeView />}
          {view === "Shop" && <ShopView />}
          {view === "Recipe Book" && <RecipeBookView />}
        </main>
        <Navigation view={view} onNavigate={setView} />
      </div>
      <footer className="console-footer">
        Brewberry preview · Gameplay coming soon
      </footer>
    </div>
  );
}
