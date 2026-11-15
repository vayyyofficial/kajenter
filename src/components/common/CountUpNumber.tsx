import React, { useState, useEffect, useRef } from 'react';

interface CountUpNumberProps {
  value: number;
  durationMs?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Viewport-triggered numeric count-up animation component (Requirement #27)
 * Counts up smoothly from 0 to actual data value using ease-out curve when entering viewport.
 */
export const CountUpNumber: React.FC<CountUpNumberProps> = ({
  value,
  durationMs = 1200,
  className = '',
  style = {},
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    // Check reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setDisplayValue(value);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setHasStarted(true);
          } else {
            // Reset when completely out of viewport so it re-triggers on scroll back up (Req #25)
            const rect = entry.boundingClientRect;
            const windowHeight = window.innerHeight || document.documentElement.clientHeight;
            if (rect.top > windowHeight || rect.bottom < 0) {
              setHasStarted(false);
              setDisplayValue(0);
            }
          }
        });
      },
      {
        threshold: 0.2,
      }
    );

    observer.observe(el);

    return () => {
      observer.unobserve(el);
    };
  }, [value]);

  useEffect(() => {
    if (!hasStarted) return;
    if (value === 0) {
      setDisplayValue(0);
      return;
    }

    let startTime: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      // Ease out exponential curve
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(easeProgress * value);

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(animationFrameId);
  }, [hasStarted, value, durationMs]);

  return (
    <span ref={elementRef} className={className} style={{ display: 'inline-block', fontVariantNumeric: 'tabular-nums', ...style }}>
      {displayValue}
    </span>
  );
};
