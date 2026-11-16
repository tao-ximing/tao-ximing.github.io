export const STILL = { duration: 0 };
export const FLIGHT_ORIGIN = { left: 0, top: 0 };
const FLIGHT_EASE = [0.2, 0.8, 0.2, 1];
const REDUCED_FLIGHT_EASE = "easeInOut";

/**
 * Transition for a framer-motion "flight" token. A flight is started by the
 * visitor and shows data moving between two nodes, so it always travels;
 * reduced motion drops the scale/rotate flourish and uses a calmer ease.
 * Render the flight inside <FlightMotion> so MotionConfig does not make the
 * x/y move instant.
 * @param {number} seconds
 * @param {boolean} reduce
 */
export function flightTransition(seconds, reduce) {
  if (!reduce) return { duration: seconds, ease: FLIGHT_EASE };
  return { duration: seconds, ease: REDUCED_FLIGHT_EASE, scale: STILL, rotate: STILL };
}
