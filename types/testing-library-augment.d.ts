declare module '@testing-library/react' {
  // Minimal ambient declarations to satisfy TypeScript for tests
  export const screen: unknown;
  export const fireEvent: unknown;
  export function render(element: unknown, options?: unknown): unknown;
}

declare module '@testing-library/jest-dom' {
  // noop to satisfy imports in tests; actual matchers are runtime-only
  const nothing: unknown;
  export default nothing;
}
