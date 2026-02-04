"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

/**
 * SafeSlot wraps Radix Slot and ensures a single React element child is passed.
 * If children are falsy or multiple, it wraps them in a <span> so React.Children.only won't throw.
 */
export default function SafeSlot({ children, ...props }: React.PropsWithChildren<any>) {
  let childForSlot: React.ReactNode = children

  try {
    if (React.Children.count(children) === 1) {
      childForSlot = React.Children.only(children as any)
    } else {
      childForSlot = <span>{children}</span>
    }
  } catch (err) {
    // If React.Children.only throws for any reason, fall back to a wrapper to keep rendering safe.
    // eslint-disable-next-line no-console
    console.warn("[dev] SafeSlot: React.Children.only failed — wrapping children to avoid crash", err)
    childForSlot = <span>{children}</span>
  }

  return (
    <Slot {...props}>{childForSlot}</Slot>
  )
}
