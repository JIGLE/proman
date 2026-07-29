import { describe, it, expect } from "vitest";
import { renderWithProviders as render, screen } from "@/tests/helpers/render-with-providers";
import { Button } from "./button";

describe("Button component", () => {
  it("renders children and applies variant classes", () => {
    render(<Button variant="outline">Click me</Button>);
    const btn = screen.getByRole("button", { name: /click me/i });
    expect(btn).toBeDefined();
    // outline variant includes a border class
    expect(btn.className).toMatch(/border/);
  });

  it("supports className and size", () => {
    render(
      <Button className="custom-class" size="sm">
        Small
      </Button>,
    );
    const btn = screen.getByRole("button", { name: /small/i });
    expect(btn.className).toContain("custom-class");
    expect(btn.className).toMatch(/h-8/);
  });

  it.each(["xs", "sm", "default", "lg", "icon", "icon-sm", "icon-lg"] as const)(
    "floors the %s size to a 44px touch target below md",
    (size) => {
      render(<Button size={size}>x</Button>);
      const btn = screen.getByRole("button", { name: /x/i });
      expect(btn.className).toMatch(/max-md:min-h-11/);
    },
  );

  // Regression: the `loading` spinner slot used to count as a second child even when
  // `loading` was false, which pushed SafeSlot down its span-wrapping fallback. Radix Slot
  // then merged these classes onto that inert <span> instead of the real <a>, so the touch
  // target silently stayed at the link's text height. Assert the classes land on the anchor.
  it("merges its classes onto the asChild element, not a wrapper", () => {
    render(
      <Button asChild size="sm">
        <a href="/somewhere">Go</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: /go/i });
    expect(link.className).toMatch(/max-md:min-h-11/);
    expect(link.tagName).toBe("A");
  });

  it("does not wrap an asChild element in an extra span", () => {
    const { container } = render(
      <Button asChild>
        <a href="/somewhere">Go</a>
      </Button>,
    );
    expect(container.querySelector("span")).toBeNull();
  });
});
