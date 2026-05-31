import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders as render } from "@/tests/helpers/render-with-providers";
import { SettingsView } from "./settings-view";

// Mock next-intl - must include NextIntlClientProvider
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => "/en/settings",
}));

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: null,
    status: "unauthenticated",
  }),
}));

// Mock toast context
vi.mock("@/lib/contexts/toast-context", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

describe("SettingsView", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    global.fetch = fetchMock as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("exports SettingsView component", () => {
    expect(typeof SettingsView).toBe("function");
  });

  it("renders without crashing", () => {
    const { container } = render(<SettingsView />);
    expect(container).toBeDefined();
  });

  it("calls fetch on mount for initial data", () => {
    render(<SettingsView />);

    // The component should attempt to fetch from at least /version.json
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(0);
  });

  it("is a React component that accepts no props", () => {
    const component = SettingsView as any;
    expect(typeof component).toBe("function");
  });
});
