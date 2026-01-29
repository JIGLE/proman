// Test DOM setup for React 18/19 compatibility
import { beforeEach, afterEach } from 'vitest';

// Ensure we have a proper DOM environment
beforeEach(() => {
  // Create a proper DOM element for React to mount into
  const container = document.createElement('div');
  container.setAttribute('data-testid', 'test-container');
  document.body.innerHTML = '';
  document.body.appendChild(container);
});

afterEach(() => {
  // Clean up DOM after each test
  document.body.innerHTML = '';
});

// Mock implementations for browser APIs only if they don't exist
if (typeof global.URL === 'undefined') {
  global.URL = {
    createObjectURL: () => 'mock-blob-url',
    revokeObjectURL: () => {},
  } as any;
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};