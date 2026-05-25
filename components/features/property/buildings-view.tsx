"use client";

import { useState } from "react";
import { Building2, Plus, Loader2, MapPin, Home, Edit2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useApp } from "@/lib/contexts/app-context";
import { useToast } from "@/lib/contexts/toast-context";
import { useConfirmDialog } from "@/lib/hooks/use-confirm-dialog";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import type { Building } from "@/lib/types";

interface BuildingFormData {
  name: string;
  address: string;
  city: string;
  country: string;
}

const emptyForm: BuildingFormData = { name: "", address: "", city: "", country: "" };

export function BuildingsView(): React.ReactElement {
  const { state, addBuilding, updateBuilding, deleteBuilding } = useApp();
  const toast = useToast();
  const confirmDialog = useConfirmDialog();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [form, setForm] = useState<BuildingFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const buildings = state.buildings ?? [];

  const openAdd = () => {
    setEditingBuilding(null);
    setForm(emptyForm);
    setIsDialogOpen(true);
  };

  const openEdit = (building: Building) => {
    setEditingBuilding(building);
    setForm({
      name: building.name,
      address: building.address ?? "",
      city: building.city ?? "",
      country: building.country ?? "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Building name is required");
      return;
    }
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        country: form.country.trim() || undefined,
      };
      if (editingBuilding) {
        await updateBuilding(editingBuilding.id, data);
        toast.success("Building updated");
      } else {
        await addBuilding(data);
        toast.success("Building added");
      }
      setIsDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (building: Building) => {
    confirmDialog.confirm(
      {
        title: "Delete Building",
        description: `"${building.name}" will be permanently removed. Properties in this building will be unlinked.`,
        confirmLabel: "Delete",
        variant: "destructive",
      },
      async () => {
        try {
          await deleteBuilding(building.id);
          toast.success("Building deleted");
        } catch {
          toast.error("Failed to delete building");
        }
      },
    );
  };

  if (state.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingBuilding ? "Edit Building" : "Add Building"}</DialogTitle>
              <DialogDescription>
                {editingBuilding ? "Edit building details" : "Create a building to group related properties together."}
              </DialogDescription>
            </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="bld-name">Name *</Label>
              <Input
                id="bld-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Riverside Apartments"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bld-address">Street Address</Label>
              <Input
                id="bld-address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="123 Main Street"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="bld-city">City</Label>
                <Input
                  id="bld-city"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="Lisbon"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bld-country">Country</Label>
                <Input
                  id="bld-country"
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  placeholder="PT"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingBuilding ? "Save Changes" : "Add Building"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog dialog={confirmDialog} />

      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-foreground)] flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              Buildings
            </h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Group properties into building complexes
            </p>
          </div>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Building
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Buildings</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{buildings.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Properties in Buildings</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {state.properties.filter((p) => p.buildingId).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Buildings List */}
        {buildings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
              <p className="text-[var(--color-foreground)] font-medium mb-1">No buildings yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Group your properties into building complexes for easier management.
              </p>
              <Button onClick={openAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Building
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {buildings.map((building) => {
              const propertyCount = state.properties.filter(
                (p) => p.buildingId === building.id,
              ).length;
              return (
                <Card key={building.id} className="hover:bg-zinc-800/30 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                          <Building2 className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">{building.name}</CardTitle>
                          {(building.city || building.address) && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className="text-xs text-muted-foreground truncate">
                                {[building.address, building.city, building.country]
                                  .filter(Boolean)
                                  .join(", ")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => openEdit(building)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                          onClick={() => handleDelete(building)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Home className="h-3.5 w-3.5" />
                      <span>
                        {propertyCount} {propertyCount === 1 ? "property" : "properties"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export default BuildingsView;
