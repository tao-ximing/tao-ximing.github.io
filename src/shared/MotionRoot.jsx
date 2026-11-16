import { MotionConfig } from "framer-motion";

// Rendered at the root of each page that uses motion.*, so framer-motion
// stays out of the shell and out of pages that never animate with it.
export default function MotionRoot({ children }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

// Flights are visitor-triggered moves between nodes. Under MotionRoot's
// "user" setting framer-motion would make their x/y jump instantly, so they
// opt out here and soften themselves through flightTransition instead.
export function FlightMotion({ children }) {
  return <MotionConfig reducedMotion="never">{children}</MotionConfig>;
}
