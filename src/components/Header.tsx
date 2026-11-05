import { Sprite } from "./Sprite";

export function Header() {
  return (
    <header className="status-bar panel panel-wood">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <div className="flex items-center gap-2">
        <Sprite name="logo" pixel={2} />
        <h1 className="brand-title">Brewberry</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ul className="contents" aria-label="Preview café stats">
          <li className="stat">
            <Sprite name="coin" pixel={1} />
            <strong>30</strong>
            <span className="sr-only">coins</span>
          </li>
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
        <span className="preview-tag">Preview</span>
      </div>
    </header>
  );
}
