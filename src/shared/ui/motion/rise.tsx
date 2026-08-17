"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export interface RiseProps {
  children: ReactNode;
  /** Stagger offset in seconds. */
  delay?: number;
  /** Rise distance in px (MPS §3: 16 for headlines, 12 for support). */
  y?: number;
  className?: string;
}

/** Entrance: rise + fade, 400ms, Cue ease-out. Static under reduced motion. */
export function Rise({ children, delay = 0, y = 16, className }: RiseProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
