/**
 * Lets only one browser tab play at a time, using the Web Locks API. The tab
 * holding the lock is the only one that loads or saves. Other tabs wait, and
 * the browser hands the lock on when the active tab closes.
 */
const LOCK_NAME = "brewberry-game";
/** Held by a tab that asked to play here, until it is playing. */
const HANDOFF_LOCK = "brewberry-handoff";
const CHANNEL_NAME = "brewberry-tabs";

type Message = { type: "takeover" };

export function tabLocksSupported(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.locks);
}

export type TabLock = {
  /** False if the browser can't message other tabs, so only closing hands over. */
  canAskToPlayHere: boolean;
  askToPlayHere: () => void;
  stop: () => void;
};

export function startTabLock(events: {
  /** This tab holds the lock: load the save and start playing. */
  onActive: () => void;
  /** Another tab is playing. */
  onWaiting: () => void;
  /** Another tab asked to play. Stop writing now: the lock is released next. */
  onHandedOff: () => void;
  /** The browser's locks stopped working. This tab can't safely play or save. */
  onFailed: () => void;
}): TabLock {
  const locks = navigator.locks;
  const channel =
    typeof BroadcastChannel === "function"
      ? new BroadcastChannel(CHANNEL_NAME)
      : null;
  let stopped = false;
  let release: (() => void) | null = null;
  let queued: AbortController | null = null;
  /** Set while this tab holds the handoff lock; called once it is playing. */
  let finishAsking: (() => void) | null = null;

  const stop = () => {
    stopped = true;
    queued?.abort();
    queued = null;
    release?.();
    release = null;
    finishAsking?.();
    channel?.close();
  };

  /**
   * A lock request failed for a reason other than this tab stopping. Without
   * the lock nothing is safe, so stop for good and let go of everything held.
   */
  const fail = () => {
    // Stopping aborts the queued request on purpose: that isn't a failure.
    if (stopped) return;
    events.onFailed();
    stop();
  };

  const hold = async (fromQueue: boolean) => {
    if (stopped) return;
    // If another tab asked to play, pass the lock on without loading anything.
    // The browser tracks both locks, so this can't miss a request. A lock
    // taken at startup can skip this: it is only granted when no tab is
    // already queued, and an asking tab is always queued.
    if (fromQueue) {
      const { held = [] } = await locks.query();
      const someoneAsked = held.some((lock) => lock.name === HANDOFF_LOCK);
      if (stopped) return;
      if (someoneAsked && !finishAsking) {
        wait();
        return;
      }
    }
    events.onActive();
    finishAsking?.();
    await new Promise<void>((resolve) => {
      release = resolve;
    });
  };

  const wait = () => {
    if (stopped) return;
    events.onWaiting();
    queued = new AbortController();
    locks
      .request(LOCK_NAME, { signal: queued.signal }, async () => {
        queued = null;
        await hold(true);
      })
      .catch(fail);
  };

  locks
    .request(LOCK_NAME, { ifAvailable: true }, async (lock) => {
      if (lock) await hold(false);
      else wait();
    })
    .catch(fail);

  if (channel) {
    channel.onmessage = (event: MessageEvent<Message>) => {
      if (event.data.type !== "takeover" || !release) return;
      // Stop writing first. Only then let go, so the asking tab can't start
      // until this one has stopped.
      events.onHandedOff();
      const letGo = release;
      release = null;
      letGo();
      wait();
    };
  }

  return {
    canAskToPlayHere: channel !== null,
    askToPlayHere: () => {
      if (finishAsking || stopped || !channel) return;
      locks
        .request(HANDOFF_LOCK, async () => {
          if (stopped) return;
          // Kept until this tab is playing, so no other waiting tab goes first.
          await new Promise<void>((resolve) => {
            finishAsking = () => {
              finishAsking = null;
              resolve();
            };
            channel.postMessage({ type: "takeover" } satisfies Message);
          });
        })
        .catch(fail);
    },
    stop,
  };
}
