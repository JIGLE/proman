"use client";

import React, { useEffect } from "react";

export default function DevDebug(): null {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const original = React.Children.only as (
      child: React.ReactNode,
    ) => React.ReactElement;
    (
      React.Children as unknown as {
        only: (child: React.ReactNode) => React.ReactElement;
      }
    ).only = function only(child: React.ReactNode) {
      try {
        return original(child);
      } catch (err) {
        try {
          console.error("React.Children.only error — child: ", child);

          console.error(new Error("React.Children.only stack").stack);
        } catch {
          /* intentionally swallowed — debug logging only */
        }
        throw err;
      }
    };
    return () => {
      (
        React.Children as unknown as {
          only: (child: React.ReactNode) => React.ReactElement;
        }
      ).only = original;
    };
  }, []);

  return null;
}
