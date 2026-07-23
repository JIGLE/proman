import { describe, it, expect } from "vitest";
import { withEntityDetail, withoutEntityDetail, parseEntityDetail } from "./entity-detail-url";

describe("withEntityDetail", () => {
  it("adds a detail param to a bare pathname", () => {
    expect(withEntityDetail("/en/people", "", "tenant", "abc123")).toBe(
      "/en/people?detail=tenant%3Aabc123",
    );
  });

  it("preserves existing search params", () => {
    expect(withEntityDetail("/en/people", "view=owners", "owner", "o1")).toBe(
      "/en/people?view=owners&detail=owner%3Ao1",
    );
  });

  it("overwrites an existing detail param", () => {
    expect(withEntityDetail("/en/people", "detail=tenant%3Aold", "tenant", "new")).toBe(
      "/en/people?detail=tenant%3Anew",
    );
  });
});

describe("withoutEntityDetail", () => {
  it("returns the bare pathname when no other params remain", () => {
    expect(withoutEntityDetail("/en/people", "detail=tenant%3Aabc123")).toBe("/en/people");
  });

  it("preserves other params after stripping detail", () => {
    expect(withoutEntityDetail("/en/people", "view=owners&detail=owner%3Ao1")).toBe(
      "/en/people?view=owners",
    );
  });

  it("is a no-op when there is no detail param", () => {
    expect(withoutEntityDetail("/en/people", "view=owners")).toBe("/en/people?view=owners");
  });
});

describe("parseEntityDetail", () => {
  it("splits a well-formed value", () => {
    expect(parseEntityDetail("tenant:abc123")).toEqual({ type: "tenant", id: "abc123" });
  });

  it("returns null for null input", () => {
    expect(parseEntityDetail(null)).toBeNull();
  });

  it("returns null for a value with no separator", () => {
    expect(parseEntityDetail("tenant")).toBeNull();
  });

  it("returns null for a value with an empty type or id", () => {
    expect(parseEntityDetail(":abc123")).toBeNull();
    expect(parseEntityDetail("tenant:")).toBeNull();
  });

  it("handles ids that themselves contain a colon", () => {
    expect(parseEntityDetail("tenant:abc:123")).toEqual({ type: "tenant", id: "abc:123" });
  });
});
