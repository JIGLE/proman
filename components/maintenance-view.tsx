"use client";

import { useState, useMemo } from "react";
import { Hammer, Plus, AlertCircle, Clock, CheckCircle, XCircle, MoreVertical, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "./ui/card";
import { useCurrency } from "@/lib/currency-context";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { LoadingState } from "./ui/loading-state";
import { SearchFilter } from "./ui/search-filter";
import { ExportButton } from "./ui/export-button";
import { useApp } from "@/lib/app-context-db";
import { maintenanceSchema, MaintenanceFormData } from "@/lib/validation";
import { useToast } from "@/lib/toast-context";
import { useFormDialog } from "@/lib/hooks/use-form-dialog";
import { useSortableData, SortDirection } from "@/lib/hooks/use-sortable-data";
import { cn } from "@/lib/utils";
import { MaintenanceStatus, MaintenancePriority } from "@/lib/types";

interface SortableHeaderProps {
  column: string;
  label: string;
  sortDirection: SortDirection;
  onSort: (column: any) => void;
}

function SortableHeader({ column, label, sortDirection, onSort }: SortableHeaderProps) {
  return (
    <button
      onClick={() => onSort(column)}
      className="flex items-center gap-1 text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors"
    >
      {label}
      {sortDirection === 'asc' && <ArrowUp className="w-3 h-3" />}
      {sortDirection === 'desc' && <ArrowDown className="w-3 h-3" />}
      {sortDirection === null && <ArrowUpDown className="w-3 h-3 opacity-50" />}
    </button>
  );
}

export function MaintenanceView(): React.ReactElement {
    const { state, addMaintenance, updateMaintenance } = useApp();
    const { properties, maintenance, loading } = state;
    const { success, error } = useToast();
    const { formatCurrency } = useCurrency();

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');

    const initialFormData: MaintenanceFormData = {
        propertyId: "",
        tenantId: undefined,
        title: "",
        description: "",
        status: "open",
        priority: "medium",
        cost: undefined,
        assignedTo: undefined,
    };

    const dialog = useFormDialog<MaintenanceFormData>({
        schema: maintenanceSchema,
        initialData: initialFormData,
        onSubmit: async (data, isEdit) => {
            if (isEdit && dialog.editingItem) {
                await updateMaintenance((dialog.editingItem as any).id, data);
                success('Maintenance ticket updated successfully');
            } else {
                await addMaintenance(data);
                success('Maintenance ticket created successfully');
            }
        },
        onError: (errorMessage) => {
            error(errorMessage);
        },
    });

    // Filter and search maintenance tickets
    const filteredTickets = useMemo(() => {
        return maintenance.filter((ticket) => {
            // Search filter (title, description, assignedTo)
            const matchesSearch = searchQuery.length === 0 || 
                ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (ticket.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (ticket.assignedTo || '').toLowerCase().includes(searchQuery.toLowerCase());

            // Status filter
            const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;

            // Priority filter
            const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;

            return matchesSearch && matchesStatus && matchesPriority;
        });
    }, [maintenance, searchQuery, statusFilter, priorityFilter]);

    // Sorting
    const { sortedData: sortedTickets, requestSort, getSortDirection } = useSortableData(filteredTickets);

    const handleEdit = (ticket: any) => {
        dialog.openEditDialog(ticket, (t) => ({
            propertyId: t.propertyId,
            tenantId: t.tenantId,
            title: t.title,
            description: t.description || '',
            status: t.status,
            priority: t.priority,
            cost: t.cost,
            assignedTo: t.assignedTo,
        }));
    };

    const getPriorityColor = (priority: MaintenancePriority) => {
        switch (priority) {
            case "low": return "bg-blue-900/20 text-blue-400 border-blue-900";
            case "medium": return "bg-yellow-900/20 text-yellow-400 border-yellow-900";
            case "high": return "bg-orange-900/20 text-orange-400 border-orange-900";
            case "urgent": return "bg-red-900/20 text-red-400 border-red-900";
            default: return "bg-zinc-800 text-zinc-400";
        }
    };

    const getStatusIcon = (status: MaintenanceStatus) => {
        switch (status) {
            case "open": return <AlertCircle className="w-4 h-4 text-blue-500" />;
            case "in_progress": return <Clock className="w-4 h-4 text-yellow-500" />;
            case "resolved": return <CheckCircle className="w-4 h-4 text-green-500" />;
            case "closed": return <XCircle className="w-4 h-4 text-zinc-500" />;
        }
    };

    return (
        <>
        {loading ? (
            <LoadingState variant="cards" count={6} />
        ) : (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-50">Maintenance</h2>
                    <p className="text-zinc-400">Manage work orders and repairs</p>
                </div>
                <div className="flex items-center gap-2">
                    <ExportButton
                        data={sortedTickets}
                        filename="maintenance"
                        columns={[
                            { key: 'title', label: 'Title' },
                            { key: 'description', label: 'Description' },
                            { 
                                key: 'propertyId', 
                                label: 'Property',
                                format: (value) => properties.find(p => p.id === value)?.name || 'Unknown'
                            },
                            { key: 'status', label: 'Status' },
                            { key: 'priority', label: 'Priority' },
                            { 
                                key: 'cost', 
                                label: 'Cost',
                                format: (value) => value ? formatCurrency(value) : 'Not set'
                            },
                            { key: 'assignedTo', label: 'Assigned To' },
                        ]}
                    />
                    <Dialog open={dialog.isOpen} onOpenChange={(open) => !open && dialog.closeDialog()}>
                        <DialogTrigger asChild>
                            <Button onClick={dialog.openDialog} className="flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                New Ticket
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-zinc-900 border-zinc-800 sm:max-w-[600px]">
                            <DialogHeader>
                                <DialogTitle>{dialog.editingItem ? 'Edit Maintenance Ticket' : 'Create Maintenance Ticket'}</DialogTitle>
                                <DialogDescription>Submit a new maintenance request</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={dialog.handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Title</Label>
                                    <Input
                                        id="title"
                                        value={dialog.formData.title}
                                        onChange={(e) => dialog.updateFormData({ title: e.target.value })}
                                        className={dialog.formErrors.title ? 'border-red-500' : ''}
                                        placeholder="e.g. Leaking faucet"
                                    />
                                    {dialog.formErrors.title && <p className="text-xs text-red-500">{dialog.formErrors.title}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="property">Property</Label>
                                        <Select
                                            value={dialog.formData.propertyId}
                                            onValueChange={(val) => dialog.updateFormData({ propertyId: val })}
                                        >
                                            <SelectTrigger id="property" className={dialog.formErrors.propertyId ? 'border-red-500' : ''}>
                                                <SelectValue placeholder="Select property" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {properties.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {dialog.formErrors.propertyId && <p className="text-xs text-red-500">{dialog.formErrors.propertyId}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="priority">Priority</Label>
                                        <Select
                                            value={dialog.formData.priority}
                                            onValueChange={(val) => dialog.updateFormData({ priority: val as MaintenancePriority })}
                                        >
                                            <SelectTrigger id="priority">
                                                <SelectValue placeholder="Priority" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="low">Low</SelectItem>
                                                <SelectItem value="medium">Medium</SelectItem>
                                                <SelectItem value="high">High</SelectItem>
                                                <SelectItem value="urgent">Urgent</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={dialog.formData.description}
                                        onChange={(e) => dialog.updateFormData({ description: e.target.value })}
                                        className={dialog.formErrors.description ? 'border-red-500' : ''}
                                        placeholder="Detailed description of the issue..."
                                        rows={4}
                                    />
                                    {dialog.formErrors.description && <p className="text-xs text-red-500">{dialog.formErrors.description}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="assignedTo">Assigned To (Optional)</Label>
                                        <Input
                                            id="assignedTo"
                                            value={dialog.formData.assignedTo || ''}
                                            onChange={(e) => dialog.updateFormData({ assignedTo: e.target.value })}
                                            placeholder="Contractor or staff name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cost">Estimated Cost ($)</Label>
                                        <Input
                                            id="cost"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={dialog.formData.cost || ''}
                                            onChange={(e) => dialog.updateFormData({ cost: e.target.value ? parseFloat(e.target.value) : undefined })}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-4">
                                    <Button type="button" variant="outline" onClick={dialog.closeDialog}>Cancel</Button>
                                    <Button type="submit" disabled={dialog.isSubmitting}>
                                        {dialog.isSubmitting ? 'Saving...' : (dialog.editingItem ? 'Update Ticket' : 'Create Ticket')}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Search and Filter */}
            <SearchFilter
                searchPlaceholder="Search by title, description, or assignee..."
                onSearchChange={setSearchQuery}
                onFilterChange={(key, value) => {
                    if (key === 'status') setStatusFilter(value);
                    if (key === 'priority') setPriorityFilter(value);
                }}
                filters={[
                    {
                        key: 'status',
                        label: 'Status',
                        options: [
                            { label: 'All Statuses', value: 'all' },
                            { label: 'Open', value: 'open' },
                            { label: 'In Progress', value: 'in_progress' },
                            { label: 'Resolved', value: 'resolved' },
                            { label: 'Closed', value: 'closed' }
                        ],
                        defaultValue: 'all'
                    },
                    {
                        key: 'priority',
                        label: 'Priority',
                        options: [
                            { label: 'All Priorities', value: 'all' },
                            { label: 'Low', value: 'low' },
                            { label: 'Medium', value: 'medium' },
                            { label: 'High', value: 'high' },
                            { label: 'Urgent', value: 'urgent' }
                        ],
                        defaultValue: 'all'
                    }
                ]}
            />

            {/* Sortable Column Headers */}
            {filteredTickets.length > 0 && (
                <div className="flex items-center gap-4 px-4 py-2 bg-zinc-900/50 rounded-lg border border-zinc-800">
                    <div className="flex-1">
                        <SortableHeader column="title" label="Title" sortDirection={getSortDirection('title')} onSort={requestSort} />
                    </div>
                    <div className="w-32">
                        <SortableHeader column="priority" label="Priority" sortDirection={getSortDirection('priority')} onSort={requestSort} />
                    </div>
                    <div className="w-32">
                        <SortableHeader column="status" label="Status" sortDirection={getSortDirection('status')} onSort={requestSort} />
                    </div>
                    <div className="w-32">
                        <SortableHeader column="cost" label="Cost" sortDirection={getSortDirection('cost')} onSort={requestSort} />
                    </div>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredTickets.length === 0 ? (
                    <div className="col-span-full">
                        <Card className="bg-zinc-900 border-zinc-800">
                            <CardContent className="p-8 text-center">
                                <Hammer className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-zinc-50 mb-2">
                                    {maintenance.length === 0 ? 'No maintenance tickets' : 'No tickets found'}
                                </h3>
                                <p className="text-zinc-400 mb-4">
                                    {maintenance.length === 0 
                                        ? 'Create a new ticket to track maintenance requests' 
                                        : 'Try adjusting your search or filters'}
                                </p>
                                {maintenance.length === 0 && (
                                    <Button onClick={dialog.openDialog} className="flex items-center gap-2">
                                        <Plus className="w-4 h-4" />
                                        Create Ticket
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    sortedTickets.map((ticket) => (
                        <Card key={ticket.id} className="bg-zinc-900 border-zinc-800">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <Badge variant="outline" className={cn("capitalize mb-2", getPriorityColor(ticket.priority))}>
                                        {ticket.priority} Priority
                                    </Badge>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                                            <DropdownMenuItem 
                                                className="text-zinc-300 focus:bg-zinc-800 cursor-pointer"
                                                onClick={() => handleEdit(ticket)}
                                            >
                                                Edit Details
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-zinc-300 focus:bg-zinc-800 cursor-pointer">Update Status</DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-400 focus:bg-zinc-800 cursor-pointer">Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <CardTitle className="text-lg font-semibold text-zinc-50 line-clamp-1">{ticket.title}</CardTitle>
                                <CardDescription className="line-clamp-1">
                                    {ticket.propertyName ? ticket.propertyName : 'Unknown Property'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pb-3">
                                <p className="text-sm text-zinc-400 line-clamp-3 mb-4">{ticket.description}</p>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-zinc-400">
                                        {getStatusIcon(ticket.status)}
                                        <span className="capitalize">{ticket.status.replace('_', ' ')}</span>
                                    </div>
                                    {ticket.cost && (
                                        <span className="font-medium text-zinc-300">{formatCurrency(ticket.cost || 0)}</span>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-3 border-t border-zinc-800 text-xs text-zinc-500 flex justify-between">
                                <span>Created {new Date(ticket.createdAt).toLocaleDateString()}</span>
                                {ticket.assignedTo && <span>Assigned: {ticket.assignedTo}</span>}
                            </CardFooter>
                        </Card>
                    ))
                )}
            </div>
        </div>
        )}
        </>
    );
}
