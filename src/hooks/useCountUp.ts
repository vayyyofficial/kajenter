import { useState, useEffect } from 'react';

/**
 * Custom hook to animate numeric count-up smoothly
 * Uses requestAnimationFrame with ease-out cubic curve (Requirement #7)
 */
export function useCountUp(endValue: number, durationMs = 1000): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // If endValue is 0, no animation needed
    if (endValue === 0) {
      setCount(0);
      return;
    }

    let startTime: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      // Ease out expo: 1 - 2^(-10 * progress)
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentVal = Math.round(easeProgress * endValue);

      setCount(currentVal);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setCount(endValue);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(animationFrameId);
  }, [endValue, durationMs]);

  return count;
}
