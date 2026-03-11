import { describe, it, expect, afterEach } from "vitest";
import { render, screen } from "@/tests/helpers/render-with-providers";
import { act } from "react";
import { DevAuthProvider } from "./dev-auth";
import { useSession } from "next-auth/react";
import React from "react";

function TestComponent() {
  const { data } = useSession();
  return <div>{data?.user?.name ?? "no-session"}</div>;
}

describe("DevAuthProvider", () => {
  const OLD_NODE_ENV = process.env.NODE_ENV;
  const OLD_NEXTAUTH_URL = process.env.NEXTAUTH_URL;

  let _oldFetch: typeof globalThis.fetch | undefined;

  beforeEach(() => {
    // Avoid next-auth client attempting to fetch without a base URL in node tests
    process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || "http://localhost";

    // Stub global fetch to prevent next-auth client logs or attempts to call relative URLs
    _oldFetch = globalThis.fetch;
    globalThis.fetch = ((_: RequestInfo | URL, __?: RequestInit) =>
      Promise.resolve(
        new Response("{}"),
      )) as unknown as typeof globalThis.fetch;
  });

  afterEach(() => {
    const env = process.env as Record<string, string | undefined>;
    if (OLD_NODE_ENV === undefined) {
      delete env.NODE_ENV;
    } else {
      env.NODE_ENV = OLD_NODE_ENV;
    }
    delete process.env.NEXT_PUBLIC_DEV_AUTH;
    process.env.NEXTAUTH_URL = OLD_NEXTAUTH_URL;

    if (_oldFetch) globalThis.fetch = _oldFetch;
  });

  it("provides a dev session when enabled in development", async () => {
    (process.env as NodeJS.ProcessEnv & { NODE_ENV?: string }).NODE_ENV =
      "development";
    process.env.NEXT_PUBLIC_DEV_AUTH = "true";

    await act(async () => {
      render(
        <DevAuthProvider>
          <TestComponent />
        </DevAuthProvider>,
      );
    });

    expect(screen.getByText("Dev User")).toBeDefined();
  });

  it("does not inject dev session when not enabled", async () => {
    (process.env as NodeJS.ProcessEnv & { NODE_ENV?: string }).NODE_ENV =
      "production";
    delete process.env.NEXT_PUBLIC_DEV_AUTH;

    await act(async () => {
      render(
        <DevAuthProvider>
          <TestComponent />
        </DevAuthProvider>,
      );
    });

    expect(screen.getByText("no-session")).toBeDefined();
  });
});
