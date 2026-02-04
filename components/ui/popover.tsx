"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils/utils";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>(({ children, ...props }, ref) => {
  const asChild = (props as any).asChild;
  const safeChild = React.Children.count(children) === 1 ? React.Children.only(children as any) : <div>{children}</div>;
  const forwardProps = { ...(props as any) };
  if ((forwardProps as any).asChild) delete (forwardProps as any).asChild;
  return (
    <PopoverPrimitive.Trigger ref={ref as any} {...(forwardProps as any)}>
      {asChild ? safeChild : children}
    </PopoverPrimitive.Trigger>
  );
});
PopoverTrigger.displayName = "PopoverTrigger";

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content ref={ref} className={cn("z-[var(--z-popover)]", className)} {...props} />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = "PopoverContent";

const PopoverPortal = PopoverPrimitive.Portal;
const PopoverClose = PopoverPrimitive.Close;
const PopoverArrow = PopoverPrimitive.Arrow;

export {
  Popover as Root,
  PopoverTrigger as Trigger,
  PopoverContent as Content,
  PopoverPortal as Portal,
  PopoverClose as Close,
  PopoverArrow as Arrow,
};

export default PopoverPrimitive;
