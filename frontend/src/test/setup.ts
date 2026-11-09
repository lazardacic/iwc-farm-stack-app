import "@testing-library/jest-dom/vitest";

// jsdom has no ResizeObserver; Headless UI uses it to position floating menus.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverStub;

// jsdom has no layout, so these geometry APIs are missing; the TipTap (ProseMirror)
// editor calls them to scroll the cursor into view.
const emptyRect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) };
const emptyRects = Object.assign([], { item: () => null }) as unknown as DOMRectList;

for (const proto of [Range.prototype, Element.prototype, Text.prototype] as unknown as Array<Record<string, unknown>>) {
  proto.getClientRects ??= () => emptyRects;
  proto.getBoundingClientRect ??= () => emptyRect;
}

document.elementFromPoint ??= () => null;
