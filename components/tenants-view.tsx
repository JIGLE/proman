"use client";

import { User, Mail, Phone, Calendar } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";

interface Tenant {
  id: number;
  name: string;
  email: string;
  phone: string;
  property: string;
  rent: number;
  leaseStart: string;
  leaseEnd: string;
  paymentStatus: "paid" | "overdue" | "pending";
  lastPayment: string;
}

const mockTenants: Tenant[] = [
  {
    id: 1,
    name: "John Smith",
    email: "john.smith@email.com",
    phone: "(555) 123-4567",
    property: "Sunset Villa",
    rent: 3500,
    leaseStart: "2024-01-01",
    leaseEnd: "2024-12-31",
    paymentStatus: "paid",
    lastPayment: "2024-12-01",
  },
  {
    id: 2,
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    phone: "(555) 234-5678",
    property: "Downtown Loft",
    rent: 4200,
    leaseStart: "2024-03-15",
    leaseEnd: "2025-03-14",
    paymentStatus: "paid",
    lastPayment: "2024-12-15",
  },
  {
    id: 3,
    name: "Michael Chen",
    email: "m.chen@email.com",
    phone: "(555) 345-6789",
    property: "Lakeside Condo",
    rent: 2900,
    leaseStart: "2024-06-01",
    leaseEnd: "2025-05-31",
    paymentStatus: "overdue",
    lastPayment: "2024-11-01",
  },
  {
    id: 4,
    name: "Emily Davis",
    email: "emily.davis@email.com",
    phone: "(555) 456-7890",
    property: "Urban Studio",
    rent: 3200,
    leaseStart: "2024-02-01",
    leaseEnd: "2025-01-31",
    paymentStatus: "pending",
    lastPayment: "2024-11-01",
  },
];

export function TenantsView() {
  const getPaymentStatusBadge = (status: Tenant["paymentStatus"]) => {
    switch (status) {
      case "paid":
        return <Badge variant="success">Paid</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-50">
          Tenant CRM
        </h2>
        <p className="text-zinc-400">Manage tenant relationships and payments</p>
      </div>

      <div className="grid gap-4">
        {mockTenants.map((tenant) => (
          <Card
            key={tenant.id}
            className="transition-all hover:shadow-lg hover:shadow-zinc-900/50"
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
                    <User className="h-6 w-6 text-zinc-400" />
                  </div>
                  <div>
                    <CardTitle className="text-zinc-50">{tenant.name}</CardTitle>
                    <CardDescription>{tenant.property}</CardDescription>
                  </div>
                </div>
                {getPaymentStatusBadge(tenant.paymentStatus)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                  </div>
                  <p className="text-sm text-zinc-50">{tenant.email}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Phone className="h-4 w-4" />
                    <span>Phone</span>
                  </div>
                  <p className="text-sm text-zinc-50">{tenant.phone}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Calendar className="h-4 w-4" />
                    <span>Lease Period</span>
                  </div>
                  <p className="text-sm text-zinc-50">
                    {new Date(tenant.leaseStart).toLocaleDateString()} -{" "}
                    {new Date(tenant.leaseEnd).toLocaleDateString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-zinc-400">Monthly Rent</div>
                  <p className="text-lg font-semibold text-zinc-50">
                    ${tenant.rent.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
