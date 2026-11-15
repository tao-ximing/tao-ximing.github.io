export const STILL = { duration: 0 };
export const FLIGHT_ORIGIN = { left: 0, top: 0 };
const FLIGHT_EASE = [0.2, 0.8, 0.2, 1];
const REDUCED_FLIGHT_SECONDS = 0.6;

/**
 * Transition for a framer-motion "flight" token.
 * Under reduced motion only the fade runs (MotionConfig already makes x/y
 * instant); onAnimationComplete still fires, so the flow keeps advancing.
 * @param {number} seconds
 * @param {boolean} reduce
 */
export function flightTransition(seconds, reduce) {
  if (!reduce) return { duration: seconds, ease: FLIGHT_EASE };
  return { duration: REDUCED_FLIGHT_SECONDS, ease: FLIGHT_EASE, scale: STILL, rotate: STILL };
}
