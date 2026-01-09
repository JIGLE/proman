declare module '@testing-library/react' {
  // Minimal ambient declarations to satisfy TypeScript for tests
  export const screen: any;
  export const fireEvent: any;
  export function render(element: any, options?: any): any;
}

declare module '@testing-library/jest-dom' {
  // noop to satisfy imports in tests; actual matchers are runtime-only
  const nothing: any;
  export default nothing;
}
