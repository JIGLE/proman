"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

/**
 * SafeSlot wraps Radix Slot and ensures a single React element child is passed.
 * If children are falsy or multiple, it wraps them in a <span> so React.Children.only won't throw.
 */
interface SafeSlotProps extends React.ComponentPropsWithoutRef<typeof Slot> {
  children?: React.ReactNode;
}

export default function SafeSlot({ children, ...props }: SafeSlotProps) {
  let childForSlot: React.ReactNode = children;

  try {
    if (React.Children.count(children) === 1) {
      childForSlot = React.isValidElement(children) ? (
        children
      ) : (
        <span>{children}</span>
      );
    } else {
      childForSlot = <span>{children}</span>;
    }
  } catch (err) {
    // If React.Children.only throws for any reason, fall back to a wrapper to keep rendering safe.
    console.warn(
      "[dev] SafeSlot: React.Children.only failed — wrapping children to avoid crash",
      err,
    );
    childForSlot = <span>{children}</span>;
  }

  return <Slot {...props}>{childForSlot}</Slot>;
}
