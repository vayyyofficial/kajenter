import React, { useRef, useState, useEffect } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number; // delay in ms
  className?: string;
  style?: React.CSSProperties;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale' | 'none';
  duration?: number; // duration in ms, default 500
  once?: boolean; // once visible, keep visible (default true to prevent invisible cards)
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  delay = 0,
  className = '',
  style = {},
  direction = 'up',
  duration = 500,
  once = true,
}) => {
  // Mobile devices default to true immediately to prevent invisible card rendering bugs
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const [isVisible, setIsVisible] = useState(isMobile);
  const domRef = useRef<HTMLDivElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check prefers-reduced-motion for accessibility (Requirement #30)
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || isMobile) {
      setIsVisible(true);
      return;
    }

    if (!domRef.current || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    // Safety timeout: guaranteed to show after 350ms even if observer fails
    const safetyTimer = setTimeout(() => {
      setIsVisible(true);
    }, 350);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (once && domRef.current) {
              observer.unobserve(domRef.current);
            }
          } else if (!once) {
            const rect = entry.boundingClientRect;
            const windowHeight = window.innerHeight || document.documentElement.clientHeight;
            if (rect.top > windowHeight || rect.bottom < 0) {
              setIsVisible(false);
            }
          }
        });
      },
      {
        threshold: 0.01,
        rootMargin: '60px 0px 60px 0px',
      }
    );

    const currentElem = domRef.current;
    if (currentElem) {
      observer.observe(currentElem);
    }

    return () => {
      clearTimeout(safetyTimer);
      if (currentElem) {
        observer.unobserve(currentElem);
      }
    };
  }, [prefersReducedMotion, once, isMobile]);

  const getTransform = () => {
    if (prefersReducedMotion || isVisible) return 'none';
    switch (direction) {
      case 'up':
        return 'translate3d(0, 24px, 0)';
      case 'down':
        return 'translate3d(0, -24px, 0)';
      case 'left':
        return 'translate3d(24px, 0, 0)';
      case 'right':
        return 'translate3d(-24px, 0, 0)';
      case 'scale':
        return 'scale3d(0.95, 0.95, 1)';
      default:
        return 'none';
    }
  };

  return (
    <div
      ref={domRef}
      className={`scroll-reveal ${isVisible ? 'revealed' : ''} ${className}`}
      style={{
        opacity: prefersReducedMotion || isVisible ? 1 : 0,
        transform: getTransform(),
        transition: prefersReducedMotion
          ? 'none'
          : `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        willChange: isVisible ? 'auto' : 'opacity, transform',
        ...style,
      }}
    >
      {children}
    </div>
  );
};
