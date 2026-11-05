import { Sprite } from "./Sprite";

export function Header({ coins }: { coins: number }) {
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
        <div className="flex flex-wrap items-center gap-2">
          <span className="preview-tag">Preview</span>
          <ul className="contents" aria-label="Preview day and orders">
            <li className="stat">Day 1</li>
            <li className="stat">
              <span className="hidden gap-[2px] sm:flex" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Sprite key={i} name="pip" pixel={1} />
                ))}
              </span>
              Orders <strong>0/5</strong>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
