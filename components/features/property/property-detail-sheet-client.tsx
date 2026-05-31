"use client";

import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { PropertyDetailView } from "./property-detail-view";

export default function PropertyDetailSheetClient({ id }: { id: string }) {
  const router = useRouter();

  const handleClose = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      // Fallback: navigate to default portfolio root
      const locale = window.location.pathname.split("/")[1] || "pt";
      router.push(`/${locale}/portfolio`);
    }
  };

  return (
    <Sheet open onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="center" className="p-0">
        <SheetTitle className="sr-only">Property details</SheetTitle>
        <SheetDescription className="sr-only">Property details for {id}</SheetDescription>
        <div className="flex flex-col h-full">
          <div className="overflow-y-auto flex-1">
            <div className="mx-auto w-full max-w-5xl p-6 h-full">
              <PropertyDetailView propertyId={id} />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
