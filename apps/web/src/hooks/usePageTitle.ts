import { useEffect } from 'react';

/**
 * Sets the document title with a consistent format.
 * Resets to the base title on unmount.
 */
export function usePageTitle(title?: string) {
  useEffect(() => {
    const baseTitle = 'Trackly';
    document.title = title ? `${title} | ${baseTitle}` : baseTitle;
    return () => {
      document.title = baseTitle;
    };
  }, [title]);
}
