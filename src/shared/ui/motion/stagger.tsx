"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export interface StaggerProps {
  children: ReactNode;
  /** Per-child delay in seconds (MPS §6: 80ms card stagger). */
  interval?: number;
  className?: string;
}

const container = {
  hidden: {},
  visible: (interval: number) => ({
    transition: { staggerChildren: interval },
  }),
};

const item = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
};

/** Wrap children in <StaggerItem> to receive the staggered rise. */
export function Stagger({
  children,
  interval = 0.08,
  className,
}: StaggerProps) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={container}
      custom={interval}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  );
}
