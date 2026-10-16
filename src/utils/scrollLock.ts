let lockCount = 0;
let preservedScrollY = 0;

/**
 * Disables background scrolling safely while preserving scroll position.
 * Prevents horizontal layout shifts by compensating for the scrollbar width.
 */
export function lockScroll(): void {
  if (typeof window === 'undefined') return;

  lockCount++;
  if (lockCount === 1) {
    preservedScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.top = `-${preservedScrollY}px`;
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.overflowY = 'scroll';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.classList.add('modal-open');
  }
}

/**
 * Re-enables background scrolling and accurately restores the previous scroll position.
 */
export function unlockScroll(): void {
  if (typeof window === 'undefined') return;

  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    const scrollY = preservedScrollY;

    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflowY = '';
    document.body.style.paddingRight = '';
    document.body.classList.remove('modal-open');

    window.scrollTo({
      top: scrollY,
      left: 0,
      behavior: 'instant' as ScrollBehavior,
    });
  }
}
