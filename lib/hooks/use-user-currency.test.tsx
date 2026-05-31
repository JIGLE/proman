import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useUserCurrency } from "./use-user-currency";

let mockStatus: "loading" | "authenticated" | "unauthenticated" = "unauthenticated";

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    status: mockStatus,
  }),
}));

describe("useUserCurrency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips settings API call when unauthenticated", async () => {
    mockStatus = "unauthenticated";
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const { result } = renderHook(() => useUserCurrency());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.currency).toBe("EUR");
  });

  it("reads defaultCurrency from nested settings payload when authenticated", async () => {
    mockStatus = "authenticated";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { defaultCurrency: "USD" } }),
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const { result } = renderHook(() => useUserCurrency());

    await waitFor(() => {
      expect(result.current.currency).toBe("USD");
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/settings");
  });
});
