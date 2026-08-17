"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export interface RevealProps {
  children: ReactNode;
  /** Stagger offset in ms (MPS §3: 80ms card rhythm). */
  delay?: number;
  className?: string;
}

/**
 * ADR-0005: scroll entrance for marketing surfaces, IntersectionObserver +
 * CSS transitions (~0.4 KB) instead of the motion runtime (~30 KB gz).
 * Public pages are LCP-critical and only need "rise + fade"; Rise/Stagger
 * (motion) stay for the booking flow, where springs and gestures earn it.
 *
 * Tokens: --duration-slow, --ease-out, 16px rise (MPS §3 entrance).
 * Reduced motion: renders visible immediately, no transition.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: "-40px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={visible && delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        "duration-slow ease-out motion-safe:transition-[opacity,transform]",
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
