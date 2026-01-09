declare module '@testing-library/react' {
  // Minimal ambient declarations to satisfy TypeScript for tests
  // Use permissive `any` so existing tests type-check without pulling
  // the full @testing-library type packages into this repo.
  export const screen: any;
  export const fireEvent: any;
  export function render(element: any, options?: any): any;
}

declare module '@testing-library/jest-dom' {
  const nothing: any;
  export default nothing;
}
