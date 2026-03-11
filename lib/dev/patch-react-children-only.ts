// Server-side helper: wrap React.Children.only in development to log call sites
import React from "react";

try {
  if (
    process.env.NODE_ENV === "development" &&
    React &&
    typeof React.Children?.only === "function"
  ) {
    const original = React.Children.only as (
      child: React.ReactNode,
    ) => React.ReactElement;
    let __didWarnReactChildrenOnly = false;
    (
      React.Children as unknown as {
        only: (child: React.ReactNode) => React.ReactElement;
      }
    ).only = function only(child: React.ReactNode) {
      try {
        return original(child);
      } catch {
        if (!__didWarnReactChildrenOnly) {
          console.error(
            "[dev] React.Children.only error (server) — child:",
            child,
          );
          console.error(new Error("React.Children.only server stack").stack);
          __didWarnReactChildrenOnly = true;
        }
        // Swallow the error in development to avoid crashing the server during SSR.
        // Return an inert fallback element so rendering can continue.
        return React.createElement("span", {
          "data-dev-react-children-only-error": "true",
        });
      }
    };
  }
} catch {
  // swallow
}
