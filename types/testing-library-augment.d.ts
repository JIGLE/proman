/* eslint-disable @typescript-eslint/no-explicit-any */

declare module "@testing-library/react" {
  // Minimal ambient declarations to satisfy TypeScript for tests
  // Use permissive `any` so existing tests type-check without pulling
  // the full @testing-library type packages into this repo.
  export const screen: any;
  export const fireEvent: any;
  export function render(element: any, options?: any): any;
  export function waitFor(callback: () => void | Promise<void>, options?: any): Promise<void>;
  export function renderHook(callback: () => any, options?: any): any;
}

declare module "@testing-library/jest-dom" {
  const nothing: any;
  export default nothing;
}
