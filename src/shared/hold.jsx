import { useEffect, useRef } from "react";

const HOLD_DELAY_MS = 240;
// A touch hold is followed by emulated mouse events and a click; this window
// swallows that click so one gesture cannot run the action twice.
const CLICK_AFTER_HOLD_MS = 700;

/**
 * Press-and-hold for mouse and touch: `onHold` fires once the press has
 * lasted HOLD_DELAY_MS.
 * @param {() => void} onHold
 */
export function useLongPress(onHold) {
  const holdTimer = useRef(null);
  const heldThisPress = useRef(false);
  const suppressClickUntil = useRef(0);

  function clearTimer() {
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }

  function beginHold(event) {
    event.preventDefault();
    clearTimer();
    heldThisPress.current = false;
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      heldThisPress.current = true;
      onHold();
    }, HOLD_DELAY_MS);
  }

  function endHold() {
    clearTimer();
    if (heldThisPress.current) {
      heldThisPress.current = false;
      suppressClickUntil.current = performance.now() + CLICK_AFTER_HOLD_MS;
    }
  }

  useEffect(() => clearTimer, []);

  return {
    pressProps: {
      onMouseDown: beginHold,
      onMouseUp: endHold,
      onMouseLeave: endHold,
      onTouchStart: beginHold,
      onTouchEnd: endHold,
      onTouchCancel: endHold,
    },
    isClickAfterHold: () => performance.now() < suppressClickUntil.current,
  };
}

/**
 * Keyboard and assistive-technology entry point for a press-and-hold node.
 * It covers the node but ignores the pointer, so mouse and touch keep using
 * the node's own hold handlers.
 */
export function HoldHitButton({ label, disabled, onActivate }) {
  return (
    <button
      type="button"
      className="hold-hit"
      aria-label={label}
      aria-disabled={disabled || undefined}
      onClick={(event) => {
        event.stopPropagation();
        onActivate();
      }}
    />
  );
}
