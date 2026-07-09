import { describe, it, expect } from "vitest";
import { getMessage, formatMessage, t } from "./format-message";
import enMessages from "@/messages/en.json";

describe("getMessage", () => {
  it("resolves a dotted path into nested messages", () => {
    expect(getMessage(enMessages, "notifications.email.footer")).toBe(
      enMessages.notifications.email.footer,
    );
  });

  it("returns the path itself when the key is missing", () => {
    expect(getMessage(enMessages, "notifications.email.doesNotExist")).toBe(
      "notifications.email.doesNotExist",
    );
  });
});

describe("formatMessage", () => {
  it("interpolates simple {var} placeholders", () => {
    expect(formatMessage("Hello {name}, you have {count} items", { name: "Ana", count: 3 })).toBe(
      "Hello Ana, you have 3 items",
    );
  });

  it("leaves unresolved placeholders untouched", () => {
    expect(formatMessage("Hello {name}", {})).toBe("Hello {name}");
  });

  it("resolves ICU plural blocks for the singular case", () => {
    const template = "Overdue by {days, plural, one {# day} other {# days}}";
    expect(formatMessage(template, { days: 1 })).toBe("Overdue by 1 day");
  });

  it("resolves ICU plural blocks for the plural case", () => {
    const template = "Overdue by {days, plural, one {# day} other {# days}}";
    expect(formatMessage(template, { days: 7 })).toBe("Overdue by 7 days");
  });

  it("handles a plural block alongside a plain placeholder", () => {
    const template = "Payment overdue by {days, plural, one {# day} other {# days}} — {property}";
    expect(formatMessage(template, { days: 1, property: "Sunset Apt. 2A" })).toBe(
      "Payment overdue by 1 day — Sunset Apt. 2A",
    );
  });
});

describe("t", () => {
  it("looks up and interpolates a real catalog entry end-to-end", () => {
    const result = t(enMessages, "notifications.email.rentReminder.subject", {
      property: "Sunset Apt. 2A",
    });
    expect(result).toBe("Rent payment due in 5 days — Sunset Apt. 2A");
  });

  it("works for the pt/es/it catalogs too (real content, not just en)", async () => {
    const pt = (await import("@/messages/pt.json")).default;
    const es = (await import("@/messages/es.json")).default;
    const it_ = (await import("@/messages/it.json")).default;

    expect(
      t(pt, "notifications.email.overdueNotice.body", {
        days: 1,
        amount: "€950",
        tenant: "Maria",
        property: "Sunset Apt. 2A",
      }),
    ).toContain("1 dia");
    expect(
      t(es, "notifications.email.overdueNotice.body", {
        days: 7,
        amount: "€950",
        tenant: "Maria",
        property: "Sunset Apt. 2A",
      }),
    ).toContain("7 días");
    expect(
      t(it_, "notifications.email.leaseRenewal.subject", { property: "Loft Alfama" }),
    ).toContain("Loft Alfama");
  });
});
