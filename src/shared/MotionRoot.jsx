import { MotionConfig } from "framer-motion";

// Rendered at the root of each page that uses motion.*, so framer-motion
// stays out of the shell and out of pages that never animate with it.
export default function MotionRoot({ children }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
