export type TabState =
  | "checking"
  | "waiting"
  | "handedOff"
  | "outdated"
  | "failed";

const text: Record<TabState, { title: string; body: string }> = {
  checking: { title: "Opening your café", body: "Just a moment…" },
  waiting: {
    title: "Brewberry is open in another tab",
    body: "Your café can only be played in one tab at a time, so progress never gets mixed up. This tab will open the café when the other one closes.",
  },
  handedOff: {
    title: "You're now playing in another tab",
    body: "This tab is paused so your progress stays in one place.",
  },
  outdated: {
    title: "This tab is out of date",
    body: "Brewberry was changed in another tab. Reload to continue with the latest progress.",
  },
  failed: {
    title: "Brewberry couldn't open your café",
    body: "Something went wrong while checking for other Brewberry tabs, so the café is paused to keep your progress safe. Reload to try again.",
  },
};

export function TabNotice({
  state,
  asking,
  stuck,
  canAskToPlayHere,
  onPlayHere,
}: {
  state: TabState;
  asking: boolean;
  stuck: boolean;
  canAskToPlayHere: boolean;
  onPlayHere: () => void;
}) {
  const { title, body } = text[state];
  return (
    <section className="tab-notice panel panel-cream" aria-labelledby="tab-notice">
      <h2 id="tab-notice" tabIndex={-1} className="pixel-heading">
        {title}
      </h2>
      <p>{body}</p>
      {(state === "outdated" || state === "failed") && (
        <button
          type="button"
          className="brew-button panel"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      )}
      {(state === "waiting" || state === "handedOff") && canAskToPlayHere && (
        <>
          <button
            type="button"
            className="brew-button panel"
            onClick={onPlayHere}
          >
            Play here instead
          </button>
          <p role="status">
            {asking &&
              (stuck
                ? "The other tab isn't responding. Close it, and your café will open here."
                : "Asking the other tab to pause…")}
          </p>
        </>
      )}
    </section>
  );
}
