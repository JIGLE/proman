"use client";

import React, { useEffect } from "react";

export default function DevDebug(): null {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const original = React.Children.only as (child: any) => any;
    (React.Children as any).only = function only(child: any) {
      try {
        return original(child);
      } catch (err) {
        try {
          console.error("React.Children.only error — child: ", child);

          console.error(new Error("React.Children.only stack").stack);
        } catch (_ignored) {
          /* intentionally swallowed — debug logging only */
        }
        throw err;
      }
    };
    return () => {
      (React.Children as any).only = original;
    };
  }, []);

  return null;
}
