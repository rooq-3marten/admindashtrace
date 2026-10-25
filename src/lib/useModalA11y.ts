import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal behaviour (WCAG 2.2 AA: 2.1.2 No keyboard trap, 2.4.3 Focus order).
 *
 * While `isOpen` is true:
 *  - focus moves into the dialog (the first focusable element) and Tab / Shift+Tab stay inside it,
 *  - Escape calls `onClose`,
 *  - when the dialog closes, focus returns to the element that opened it.
 *
 * Attach the returned ref to the dialog container and give that container
 * role="dialog", aria-modal="true" and an aria-labelledby / aria-label.
 */
export function useModalA11y<T extends HTMLElement = HTMLDivElement>(isOpen: boolean, onClose: () => void) {
  const containerRef = useRef<T | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const container = containerRef.current;

    const focusables = () =>
      container
        ? Array.from<HTMLElement>(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
            (el) => el.offsetParent !== null || el === document.activeElement
          )
        : [];

    // Move focus into the dialog
    const initial = focusables();
    if (initial.length > 0) {
      initial[0].focus();
    } else if (container) {
      container.setAttribute('tabindex', '-1');
      container.focus();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !container) return;

      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && (active === first || !container.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !container.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [isOpen]);

  return containerRef;
}
