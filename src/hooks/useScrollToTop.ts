import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scroll to top on route change
 * Use this hook in your main App component to automatically scroll to top on navigation
 */
export const useScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top when route changes
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }, [pathname]);
};

/**
 * Programmatic scroll to top utility
 * Use this when you need to scroll to top on button clicks or actions
 */
export const scrollToTop = (behavior: ScrollBehavior = 'smooth') => {
  window.scrollTo({
    top: 0,
    left: 0,
    behavior
  });
};

/**
 * Scroll to element utility
 * Use this to scroll to specific elements
 */
export const scrollToElement = (
  elementId: string,
  options?: {
    behavior?: ScrollBehavior;
    block?: ScrollLogicalPosition;
    offset?: number;
  }
) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  const top = element.getBoundingClientRect().top + window.pageYOffset - (options?.offset || 0);

  window.scrollTo({
    top,
    behavior: options?.behavior || 'smooth'
  });
};

/**
 * Scroll into view utility
 * Use this for elements without IDs
 */
export const scrollIntoView = (
  element: HTMLElement | null,
  options?: ScrollIntoViewOptions
) => {
  if (!element) return;

  element.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
    ...options
  });
};
