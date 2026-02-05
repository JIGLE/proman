"use client";

import { useState, useEffect, useCallback } from "react";
import { Wrench, Plus, Search, Star, Phone, Mail, Building2, Tag, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatCurrency as formatCurrencyUtil, type Currency } from "@/lib/utils/currency";

interface MaintenanceContact {
  id: string;
  name: string;
  company: string | null;
  type: "contractor" | "vendor" | "internal";
  specialties: string[];
  email: string | null;
  phone: string | null;
  hourlyRate: number | null;
  currency: string;
  rating: number | null;
  notes: string | null;
}

const typeLabels: Record<string, string> = {
  contractor: "Contractor",
  vendor: "Vendor",
  internal: "Internal Staff",
};

const typeColors: Record<string, string> = {
  contractor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  vendor: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  internal: "bg-green-500/10 text-green-600 border-green-500/20",
};

export function ContactsView(): React.ReactElement {
  const [contacts, setContacts] = useState<MaintenanceContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/contacts");
      if (res.ok) {
        const json = await res.json();
        // Transform API response to match component interface
        const data = (json.data || []).map((c: Record<string, unknown>) => ({
          id: c.id,
          name: c.contactPerson || c.name || "Unknown",
          company: c.company || null,
          type: c.type || "contractor",
          specialties: typeof c.specialties === "string" ? JSON.parse(c.specialties) : c.specialties || [],
          email: c.email || null,
          phone: c.phone || null,
          hourlyRate: c.hourlyRate ?? null,
          currency: c.currency || "EUR",
          rating: c.rating ?? null,
          notes: c.notes || null,
        }));
        setContacts(data);
      }
    } catch (err) {
      console.error("Failed to fetch contacts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contact.company?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      contact.specialties.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (activeTab === "all") return matchesSearch;
    return matchesSearch && contact.type === activeTab;
  });

  const stats = {
    total: contacts.length,
    contractors: contacts.filter((c) => c.type === "contractor").length,
    vendors: contacts.filter((c) => c.type === "vendor").length,
    internal: contacts.filter((c) => c.type === "internal").length,
  };

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
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
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)] flex items-center gap-2">
            <Wrench className="h-6 w-6" />
            Maintenance Contacts
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Manage contractors, vendors, and internal staff
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contractors</CardTitle>
            <div className="h-2 w-2 rounded-full bg-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.contractors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendors</CardTitle>
            <div className="h-2 w-2 rounded-full bg-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.vendors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Internal Staff</CardTitle>
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.internal}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, or specialty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="contractor">Contractors</TabsTrigger>
            <TabsTrigger value="vendor">Vendors</TabsTrigger>
            <TabsTrigger value="internal">Internal</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Contacts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredContacts.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No contacts found
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <Card key={contact.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {getInitials(contact.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{contact.name}</CardTitle>
                      {contact.company && (
                        <CardDescription className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {contact.company}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className={typeColors[contact.type]}>
                    {typeLabels[contact.type]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Specialties */}
                <div className="flex flex-wrap gap-1">
                  {contact.specialties.map((specialty) => (
                    <Badge key={specialty} variant="secondary" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      {specialty}
                    </Badge>
                  ))}
                </div>

                {/* Contact Info */}
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {contact.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" />
                      <a href={`mailto:${contact.email}`} className="hover:text-foreground">
                        {contact.email}
                      </a>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" />
                      <a href={`tel:${contact.phone}`} className="hover:text-foreground">
                        {contact.phone}
                      </a>
                    </div>
                  )}
                </div>

                {/* Rate and Rating */}
                <div className="flex items-center justify-between pt-2 border-t">
                  {contact.hourlyRate ? (
                    <span className="text-sm font-medium">
                      {formatCurrencyUtil(contact.hourlyRate, { currency: contact.currency as Currency })}/hr
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                  {contact.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-medium">{contact.rating}</span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {contact.notes && (
                  <p className="text-xs text-muted-foreground italic">
                    "{contact.notes}"
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export default ContactsView;
