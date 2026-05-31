/* eslint-disable @typescript-eslint/no-explicit-any */

// Minimal Vitest global declarations for editor type-checking in test files.
// We keep these permissive to avoid coupling root tsconfig to vitest package type resolution.
declare const describe: any;
declare const it: any;
declare const test: any;
declare const expect: any;
declare const vi: any;
declare const beforeEach: any;
declare const afterEach: any;
declare const beforeAll: any;
declare const afterAll: any;
