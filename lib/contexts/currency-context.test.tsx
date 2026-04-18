import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

let mockStatus: "loading" | "authenticated" | "unauthenticated" = "unauthenticated";

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    status: mockStatus,
  }),
}));

function CurrencyReader({
  useCurrency,
}: {
  useCurrency: () => { currency: string; isLoading: boolean };
}) {
  const { currency, isLoading } = useCurrency();

  return (
    <div>
      <span data-testid="currency">{currency}</span>
      <span data-testid="loading">{String(isLoading)}</span>
    </div>
  );
}

describe("CurrencyProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not call settings API when user is unauthenticated", async () => {
    const { CurrencyProvider, useCurrency } =
      await vi.importActual<typeof import("./currency-context")>("./currency-context");

    mockStatus = "unauthenticated";
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof global.fetch;

    render(
      <CurrencyProvider>
        <CurrencyReader useCurrency={useCurrency} />
      </CurrencyProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("currency").textContent).toBe("EUR");
  });

  it("loads currency from nested settings payload when authenticated", async () => {
    const { CurrencyProvider, useCurrency } =
      await vi.importActual<typeof import("./currency-context")>("./currency-context");

    mockStatus = "authenticated";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { defaultCurrency: "USD" } }),
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    render(
      <CurrencyProvider>
        <CurrencyReader useCurrency={useCurrency} />
      </CurrencyProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("currency").textContent).toBe("USD");
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/settings");
  });
});
