import { describe, it, expect } from "vitest";

describe("Health Endpoint (/api/health) - Integration", () => {
  it("exports a GET handler function", async () => {
    const { GET } = await import("./route");
    expect(typeof GET).toBe("function");
  });

  it("exports runtime constant as nodejs", async () => {
    const { runtime } = await import("./route");
    expect(runtime).toBe("nodejs");
  });

  it("handler is an async function", async () => {
    const { GET } = await import("./route");
    expect(GET.constructor.name).toBe("AsyncFunction");
  });
});
