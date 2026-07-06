// jest-dom adds custom jest matchers for asserting on DOM nodes.
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// ─── jsdom polyfills ─────────────────────────────────────────────────────────
// jsdom doesn't implement several browser APIs the app relies on (MUI's
// useMediaQuery, PWA display-mode checks, scroll helpers, canvas-confetti).
// Provide safe stubs so components render in tests without crashing.

// window.matchMedia — used by MUI useMediaQuery and Login's standalone check.
if (typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {}, // deprecated API still called by some libs
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// IntersectionObserver — used by lazy/scroll-into-view components.
if (typeof window.IntersectionObserver !== 'function') {
  class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  window.IntersectionObserver = MockIntersectionObserver;
  global.IntersectionObserver = MockIntersectionObserver;
}

// ResizeObserver — used by charts (recharts) and some MUI internals.
if (typeof window.ResizeObserver !== 'function') {
  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = MockResizeObserver;
  global.ResizeObserver = MockResizeObserver;
}

// Scrolling APIs — jsdom throws "not implemented" for these.
window.scrollTo = window.scrollTo || (() => {});
window.scroll = window.scroll || (() => {});
if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

// Canvas — canvas-confetti calls getContext('2d'); jsdom returns null and the
// library then dereferences it. A minimal 2d stub keeps celebration paths from
// crashing when a test doesn't bother mocking canvas-confetti/celebrate.
if (window.HTMLCanvasElement) {
  const noop = () => {};
  window.HTMLCanvasElement.prototype.getContext =
    window.HTMLCanvasElement.prototype.getContext ||
    function getContext() {
      return {
        fillRect: noop, clearRect: noop, save: noop, restore: noop,
        beginPath: noop, closePath: noop, arc: noop, fill: noop, stroke: noop,
        ellipse: noop, moveTo: noop, lineTo: noop, translate: noop,
        rotate: noop, scale: noop, setTransform: noop, transform: noop,
        drawImage: noop, createLinearGradient: () => ({ addColorStop: noop }),
        measureText: () => ({ width: 0 }), fillText: noop, getImageData: () => ({ data: [] }),
      };
    };
}

// navigator.clipboard — copy-invite-link flows.
if (!navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    writable: true,
    value: { writeText: () => Promise.resolve(), readText: () => Promise.resolve('') },
  });
}

// requestAnimationFrame-based animations (framer-motion, count-ups).
window.requestAnimationFrame = window.requestAnimationFrame || ((cb) => setTimeout(cb, 0));
window.cancelAnimationFrame = window.cancelAnimationFrame || ((id) => clearTimeout(id));
