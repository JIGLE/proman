"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { Sidebar } from "@/components/sidebar";
import { OverviewView } from "@/components/overview-view";
import { PropertiesView } from "@/components/properties-view";
import { TenantsView } from "@/components/tenants-view";
import { FinancialsView } from "@/components/financials-view";
import { ReceiptsView } from "@/components/receipts-view";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState("overview");

  if (status === "loading") {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Welcome to Proman</h1>
          <p className="text-zinc-400 mb-8">Please sign in to access your property management dashboard.</p>
          <Button onClick={() => signIn("google")} className="bg-blue-600 hover:bg-blue-700">
            Sign in with Google
          </Button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewView />;
      case "properties":
        return <PropertiesView />;
      case "tenants":
        return <TenantsView />;
      case "financials":
        return <FinancialsView />;
      case "receipts":
        return <ReceiptsView />;
      default:
        return <OverviewView />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 md:p-8 lg:p-10">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

