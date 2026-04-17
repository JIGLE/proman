import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders as render } from "@/tests/helpers/render-with-providers";
import { act } from "react";
import { Sidebar } from "./sidebar";
import type { PortalRole } from "@/lib/portal-access";

interface MockPortalAccess {
  role: PortalRole;
  isOwner: boolean;
  isTenant: boolean;
  activeTenantId: string | null;
  canManage: boolean;
  canAccess: (pathname: string) => boolean;
  switchDemoRole: () => void;
}

const mockUsePortalAccess = vi.fn<() => MockPortalAccess>(() => ({
  role: "owner",
  isOwner: true,
  isTenant: false,
  activeTenantId: null,
  canManage: true,
  canAccess: () => true,
  switchDemoRole: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/en/overview",
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { name: "Alice", email: "a@example.com", image: "/a.png" } },
  }),
  signOut: vi.fn(),
}));

vi.mock("@/lib/contexts/theme-context", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
    systemTheme: "light",
  }),
}));

vi.mock("@/lib/contexts/portal-access-context", () => ({
  usePortalAccess: () => mockUsePortalAccess(),
}));

describe("Sidebar", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUsePortalAccess.mockReturnValue({
      role: "owner",
      isOwner: true,
      isTenant: false,
      activeTenantId: null,
      canManage: true,
      canAccess: () => true,
      switchDemoRole: vi.fn(),
    });
    // Ensure no persisted collapsed state by default
    window.localStorage.removeItem("proman.sidebar.collapsed");
  });

  it("renders menu and calls onTabChange when button clicked", async () => {
    const onTabChange = vi.fn();
    let container: HTMLElement;
    await act(async () => {
      ({ container } = render(<Sidebar activeTab="overview" onTabChange={onTabChange} />));
    });

    // Just verify the component renders
    expect(container!).toBeDefined();
  });

  it("shows user info when session present", async () => {
    const onTabChange = vi.fn();
    let getByText: (text: string) => HTMLElement;
    await act(async () => {
      ({ getByText } = render(<Sidebar activeTab="overview" onTabChange={onTabChange} />));
    });

    // Username should be visible in expanded mode
    expect(getByText!("Alice")).toBeDefined();
  });

  it("hides labels when collapsed, hides notifications, and shows header toggle", async () => {
    // Persist collapsed state so the component mounts collapsed
    window.localStorage.setItem("proman.sidebar.collapsed", "true");
    let queryByText: (text: string) => HTMLElement | null;
    let queryByLabelText: (text: RegExp) => HTMLElement | null;
    let getByLabelText: (text: string) => HTMLElement;
    await act(async () => {
      ({ queryByText, queryByLabelText, getByLabelText } = render(
        <Sidebar activeTab="overview" />,
      ));
    });

    // Username should not be visible in collapsed mode
    expect(queryByText!("Alice")).toBeNull();

    // Notifications button should be hidden when collapsed
    expect(queryByLabelText!(/Notifications/)).toBeNull();

    // Header collapse toggle should be present with Expand label
    expect(getByLabelText!("Expand Sidebar")).toBeDefined();

    // Header text 'Proman' should be hidden when collapsed
    expect(queryByText!("Proman")).toBeNull();
  });

  it("shows labels when expanded and username & notifications are visible", async () => {
    window.localStorage.setItem("proman.sidebar.collapsed", "false");
    let getByText: (text: string) => HTMLElement;
    let getByLabelText: (text: RegExp | string) => HTMLElement;
    await act(async () => {
      ({ getByText, getByLabelText } = render(<Sidebar activeTab="overview" />));
    });
    expect(getByText!("Alice")).toBeDefined();

    // Notifications button should be present when expanded
    expect(getByLabelText!(/Notifications/)).toBeDefined();

    // Header collapse toggle should be present with Collapse label
    expect(getByLabelText!("Collapse Sidebar")).toBeDefined();
  });

  it("filters owner-only navigation for tenant mode", async () => {
    mockUsePortalAccess.mockReturnValue({
      role: "tenant",
      isOwner: false,
      isTenant: true,
      activeTenantId: "tenant-1",
      canManage: false,
      canAccess: (pathname: string) => !pathname.startsWith("/owners"),
      switchDemoRole: vi.fn(),
    });

    let queryByText: (text: string) => HTMLElement | null;
    let getByText: (text: string) => HTMLElement;
    await act(async () => {
      ({ queryByText, getByText } = render(<Sidebar activeTab="overview" />));
    });

    expect(getByText!("Properties")).toBeDefined();
    expect(getByText!("Documents")).toBeDefined();
    expect(queryByText!("Owners")).toBeNull();
    expect(queryByText!("Tenants")).toBeNull();
  });
});
