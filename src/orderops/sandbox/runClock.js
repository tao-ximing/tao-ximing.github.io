/**
 * A pausable, cancellable clock for one sandbox run. Sleeps are rAF-driven so
 * they stop counting while paused, and every tracked Web Animation is paused,
 * resumed or cancelled together with the run.
 */

export class Cancelled extends Error {
  constructor() {
    super("Sandbox run cancelled");
    this.name = "Cancelled";
  }
}

/**
 * @typedef {{
 *   sleep: (ms: number) => Promise<void>,
 *   play: (animation: Animation) => Promise<void>,
 *   track: (animation: Animation) => () => void,
 *   setPaused: (next: boolean) => void,
 *   cancel: () => void,
 *   readonly cancelled: boolean,
 * }} RunClock
 */

/** @returns {RunClock} */
export function createRunClock() {
  let paused = false;
  let cancelled = false;
  const live = new Set();

  function sleep(ms) {
    return new Promise((resolve, reject) => {
      let left = ms;
      let last = performance.now();
      const tick = (now) => {
        if (cancelled) return reject(new Cancelled());
        if (!paused) left -= now - last;
        last = now;
        if (left <= 0) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  function track(animation) {
    live.add(animation);
    if (paused) animation.pause();
    return () => live.delete(animation);
  }

  async function play(animation) {
    const untrack = track(animation);
    try {
      await animation.finished;
    } catch {
      throw new Cancelled();
    } finally {
      untrack();
    }
    if (cancelled) throw new Cancelled();
  }

  function setPaused(next) {
    paused = next;
    live.forEach((animation) => (paused ? animation.pause() : animation.play()));
  }

  function cancel() {
    cancelled = true;
    live.forEach((animation) => animation.cancel());
    live.clear();
  }

  return {
    sleep,
    play,
    track,
    setPaused,
    cancel,
    get cancelled() {
      return cancelled;
    },
  };
}
