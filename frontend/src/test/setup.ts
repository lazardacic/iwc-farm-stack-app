import "@testing-library/jest-dom/vitest";

// jsdom has no ResizeObserver; Headless UI uses it to position floating menus.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverStub;
