"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Plus, Search, Calendar, Building2, User, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency as formatCurrencyUtil } from "@/lib/utils/currency";
import { Currency } from "@prisma/client";
import { ContractDetailDialog } from "./contract-detail-dialog";

interface Lease {
  id: string;
  propertyName: string;
  unitName: string | null;
  tenantName: string;
  startDate: string;
  endDate: string | null;
  monthlyRent: number;
  currency: string;
  status: "active" | "expiring" | "expired" | "terminated";
}

const statusColors: Record<string, string> = {
  active: "bg-green-500/10 text-green-600 border-green-500/20",
  expiring: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  expired: "bg-red-500/10 text-red-600 border-red-500/20",
  terminated: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

export function ContractsView(): React.ReactElement {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/contracts");
      if (res.ok) {
        const json = await res.json();
        setLeases(json.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch contracts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const filteredLeases = leases.filter((lease) => {
    const matchesSearch =
      lease.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lease.tenantName.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    return matchesSearch && lease.status === activeTab;
  });

  // Sort leases: expiring first (by days remaining), then active, then expired
  const sortedLeases = [...filteredLeases].sort((a, b) => {
    // Helper to get days remaining
    const getDaysRemaining = (lease: Lease) => {
      if (!lease.endDate) return Infinity; // Open-ended leases go last
      const end = new Date(lease.endDate);
      const now = new Date();
      return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    };

    const daysA = getDaysRemaining(a);
    const daysB = getDaysRemaining(b);

    // If both are expiring (positive days), sort by soonest first
    if (daysA > 0 && daysB > 0) {
      return daysA - daysB;
    }

    // If both are expired (negative days), sort by most recently expired first
    if (daysA <= 0 && daysB <= 0) {
      return daysB - daysA;
    }

    // One is expiring, one is expired - expiring comes first
    return daysB - daysA;
  });

  const stats = {
    total: leases.length,
    active: leases.filter((l) => l.status === "active").length,
    expiring: leases.filter((l) => l.status === "expiring").length,
    expired: leases.filter((l) => l.status === "expired").length,
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleViewDetails = (lease: Lease) => {
    setSelectedLease(lease);
    setIsDetailOpen(true);
  };

  const handleEdit = (lease: Lease) => {
    // TODO: Implement edit functionality
    console.log("Edit lease:", lease);
  };

  const handleDelete = (leaseId: string) => {
    // TODO: Implement delete functionality
    setLeases(leases.filter((l) => l.id !== leaseId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contract Detail Dialog */}
      <ContractDetailDialog
        lease={selectedLease}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)] flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Contracts
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Manage leases and rental agreements
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Lease
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contracts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <div className="h-2 w-2 rounded-full bg-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.expiring}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <div className="h-2 w-2 rounded-full bg-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by property or tenant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="expiring">Expiring</TabsTrigger>
            <TabsTrigger value="expired">Expired</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Leases Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Monthly Rent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLeases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No contracts found
                  </TableCell>
                </TableRow>
              ) : (
                sortedLeases.map((lease) => (
                  <TableRow 
                    key={lease.id}
                    className="cursor-pointer hover:bg-zinc-800/50 transition-colors"
                    onClick={() => handleViewDetails(lease)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{lease.propertyName}</div>
                          {lease.unitName && (
                            <div className="text-xs text-muted-foreground">{lease.unitName}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {lease.tenantName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {formatDate(lease.startDate)}
                        {lease.endDate && (
                          <>
                            <span className="text-muted-foreground">→</span>
                            {formatDate(lease.endDate)}
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrencyUtil(lease.monthlyRent, { currency: lease.currency as Currency })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColors[lease.status]}
                      >
                        {lease.status.charAt(0).toUpperCase() + lease.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default ContractsView;
