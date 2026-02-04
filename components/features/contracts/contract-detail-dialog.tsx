"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Building2, User, DollarSign, FileText, Edit, Trash2 } from "lucide-react";
import { formatCurrency as formatCurrencyUtil, type Currency } from "@/lib/utils/currency";

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

interface ContractDetailDialogProps {
  lease: Lease | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (lease: Lease) => void;
  onDelete?: (leaseId: string) => void;
}

const statusColors: Record<string, string> = {
  active: "bg-green-500/10 text-green-600 border-green-500/20",
  expiring: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  expired: "bg-red-500/10 text-red-600 border-red-500/20",
  terminated: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

export function ContractDetailDialog({
  lease,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: ContractDetailDialogProps) {
  if (!lease) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const calculateDaysRemaining = () => {
    if (!lease.endDate) return null;
    const end = new Date(lease.endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const daysRemaining = calculateDaysRemaining();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-[var(--color-foreground)]">
                Contract Details
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Lease ID: {lease.id}
              </p>
            </div>
            <Badge variant="outline" className={statusColors[lease.status]}>
              {lease.status.charAt(0).toUpperCase() + lease.status.slice(1)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Property and Tenant Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>Property</span>
              </div>
              <div className="text-lg font-semibold text-[var(--color-foreground)]">
                {lease.propertyName}
              </div>
              {lease.unitName && (
                <div className="text-sm text-muted-foreground">{lease.unitName}</div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Tenant</span>
              </div>
              <div className="text-lg font-semibold text-[var(--color-foreground)]">
                {lease.tenantName}
              </div>
            </div>
          </div>

          {/* Contract Period */}
          <div className="border-t border-zinc-800 pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Calendar className="h-4 w-4" />
              <span>Contract Period</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Start Date</div>
                <div className="text-base font-medium text-[var(--color-foreground)]">
                  {formatDate(lease.startDate)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">End Date</div>
                <div className="text-base font-medium text-[var(--color-foreground)]">
                  {lease.endDate ? formatDate(lease.endDate) : "Open-ended"}
                </div>
              </div>
            </div>
            {daysRemaining !== null && (
              <div className="mt-3 p-3 rounded-lg bg-zinc-800/50">
                <div className="text-sm">
                  {daysRemaining > 0 ? (
                    <span className="text-amber-400">
                      {daysRemaining} days remaining
                    </span>
                  ) : (
                    <span className="text-red-400">
                      Expired {Math.abs(daysRemaining)} days ago
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Financial Info */}
          <div className="border-t border-zinc-800 pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <DollarSign className="h-4 w-4" />
              <span>Monthly Rent</span>
            </div>
            <div className="text-3xl font-bold text-[var(--color-foreground)]">
              {formatCurrencyUtil(lease.monthlyRent, { currency: lease.currency as Currency })}
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-zinc-800 pt-4 flex gap-2">
            {onEdit && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  onEdit(lease);
                  onClose();
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Contract
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                className="flex-1 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                onClick={() => {
                  if (confirm("Are you sure you want to terminate this contract?")) {
                    onDelete(lease.id);
                    onClose();
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Terminate
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
