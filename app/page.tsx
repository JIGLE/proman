"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { OverviewView } from "@/components/overview-view";
import { PropertiesView } from "@/components/properties-view";
import { TenantsView } from "@/components/tenants-view";
import { FinancialsView } from "@/components/financials-view";
import { ReceiptsView } from "@/components/receipts-view";

export default function Home() {
  const [activeTab, setActiveTab] = useState("overview");

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

