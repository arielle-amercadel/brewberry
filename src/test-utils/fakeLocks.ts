/**
 * A small stand-in for navigator.locks, which jsdom doesn't have. It grants one
 * exclusive lock per name, queues other requests in order, and supports
 * ifAvailable and abort signals, like the browser version. Requests and queries
 * can also be made to fail, as a broken browser implementation might.
 */
type Grant = () => void;

export function installFakeLocks() {
  const held = new Set<string>();
  const queues = new Map<
    string,
    { grant: Grant; signal?: AbortSignal; reject: (error: unknown) => void }[]
  >();
  const failingNames = new Set<string>();
  let failingQuery = false;
  const broken = () => new DOMException("locks broke", "InvalidStateError");

  const next = (name: string) => {
    const queue = queues.get(name) ?? [];
    const waiting = queue.shift();
    waiting?.grant();
  };

  function request(
    name: string,
    optionsOrCallback:
      | { ifAvailable?: boolean; signal?: AbortSignal }
      | ((lock: { name: string } | null) => Promise<unknown>),
    maybeCallback?: (lock: { name: string } | null) => Promise<unknown>,
  ) {
    const options = typeof optionsOrCallback === "function" ? {} : optionsOrCallback;
    const callback = (typeof optionsOrCallback === "function" ? optionsOrCallback : maybeCallback)!;
    return new Promise((resolve, reject) => {
      const grant = () => {
        held.add(name);
        // Called straight away, so tests see the result of a free lock at once.
        let result: Promise<unknown>;
        try {
          result = Promise.resolve(callback({ name }));
        } catch (error) {
          result = Promise.reject(error);
        }
        result
          .then(resolve, reject)
          .finally(() => {
            held.delete(name);
            next(name);
          });
      };
      if (failingNames.has(name)) {
        Promise.resolve().then(() => reject(broken()));
        return;
      }
      if (options.signal?.aborted) {
        reject(new DOMException("aborted", "AbortError"));
        return;
      }
      if (!held.has(name) && (queues.get(name) ?? []).length === 0) {
        grant();
        return;
      }
      if (options.ifAvailable) {
        Promise.resolve()
          .then(() => callback(null))
          .then(resolve, reject);
        return;
      }
      const entry = { grant, signal: options.signal, reject };
      queues.set(name, [...(queues.get(name) ?? []), entry]);
      options.signal?.addEventListener("abort", () => {
        queues.set(
          name,
          (queues.get(name) ?? []).filter((item) => item !== entry),
        );
        reject(new DOMException("aborted", "AbortError"));
      });
    });
  }

  const query = async () => {
    if (failingQuery) throw broken();
    return snapshot();
  };
  const snapshot = () => ({
    held: [...held].map((name) => ({ name })),
    pending: [...queues].flatMap(([name, queue]) => queue.map(() => ({ name }))),
  });

  Object.defineProperty(navigator, "locks", {
    value: { request, query },
    configurable: true,
  });

  return {
    isHeld: (name: string) => held.has(name),
    waitingCount: (name: string) => queues.get(name)?.length ?? 0,
    /** Holds a lock as an unresponsive tab would, until released. */
    holdAsFrozenTab: (name: string) => {
      let release = () => {};
      void request(name, {}, () => new Promise<void>((r) => (release = r)));
      return () => release();
    },
    /** New requests for this lock fail instead of being granted or queued. */
    failRequests: (name: string) => failingNames.add(name),
    /** Requests already queued for this lock fail, as if the browser dropped them. */
    failQueued: (name: string) => {
      const queue = queues.get(name) ?? [];
      queues.set(name, []);
      for (const entry of queue) entry.reject(broken());
    },
    /** navigator.locks.query() fails from now on. */
    failQuery: () => {
      failingQuery = true;
    },
    uninstall: () => {
      delete (navigator as { locks?: unknown }).locks;
    },
  };
}
