// Server-side helper: wrap React.Children.only in development to log call sites
import React from "react";

try {
  if (process.env.NODE_ENV === "development" && React && typeof React.Children?.only === "function") {
    const original = React.Children.only;
    let __didWarnReactChildrenOnly = false;
    (React.Children as any).only = function only(child: any) {
      try {
        return original(child);
      } catch (err) {
        if (!__didWarnReactChildrenOnly) {
          // eslint-disable-next-line no-console
          console.error("[dev] React.Children.only error (server) — child:", child);
          // eslint-disable-next-line no-console
          console.error(new Error("React.Children.only server stack").stack);
          __didWarnReactChildrenOnly = true;
        }
        // Swallow the error in development to avoid crashing the server during SSR.
        // Return an inert fallback element so rendering can continue.
        return React.createElement('span', { 'data-dev-react-children-only-error': 'true' });
      }
    };
  }
} catch (e) {
  // swallow
}
