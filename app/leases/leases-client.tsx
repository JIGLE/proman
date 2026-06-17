"use client";

import LeaseManagement from "@/components/lease-management";
import { AppProvider } from "@/lib/app-context-db";
import { Sidebar } from "@/components/layouts/sidebar";
import { ToastProvider } from "@/lib/contexts/toast-context";
import { CsrfProvider } from "@/lib/contexts/csrf-context";

export default function LeasesClient() {
  return (
    <CsrfProvider>
      <ToastProvider>
        <AppProvider>
          <div className="flex h-screen overflow-hidden bg-zinc-950">
            <Sidebar activeTab={"leases"} onTabChange={() => {}} />
            <main className="flex-1 overflow-y-auto relative flex flex-col">
              <div className="flex-1 container mx-auto p-6 md:p-8 lg:p-10">
                <LeaseManagement />
              </div>
            </main>
          </div>
        </AppProvider>
      </ToastProvider>
    </CsrfProvider>
  );
}
