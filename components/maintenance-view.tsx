"use client";

import { useState } from "react";
import { ZodError } from "zod";
import { Hammer, Plus, AlertCircle, Clock, CheckCircle, XCircle, MoreVertical } from "lucide-react";
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
import { useApp } from "@/lib/app-context-db";
import { maintenanceSchema, MaintenanceFormData } from "@/lib/validation";
import { useToast } from "@/lib/toast-context";
import { cn } from "@/lib/utils";
import { MaintenanceStatus, MaintenancePriority } from "@/lib/types";

export function MaintenanceView(): React.ReactElement {
    const { state, addMaintenance } = useApp();
    const { properties, maintenance } = state;
    const { success, error } = useToast();
    const { formatCurrency } = useCurrency();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [filterStatus, setFilterStatus] = useState<MaintenanceStatus | "all">("all");

    const [formData, setFormData] = useState<MaintenanceFormData>({
        propertyId: "",
        tenantId: undefined,
        title: "",
        description: "",
        status: "open",
        priority: "medium",
        cost: undefined,
        assignedTo: undefined,
    });
    const [formErrors, setFormErrors] = useState<Partial<Record<keyof MaintenanceFormData, string>>>({});

    const filteredTickets = maintenance.filter(ticket =>
        filterStatus === "all" ? true : ticket.status === filterStatus
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFormErrors({});

        try {
            const validatedData = maintenanceSchema.parse(formData);
            await addMaintenance(validatedData);
            success('Maintenance ticket created successfully!');
            setIsDialogOpen(false);
            resetForm();
        } catch (err: unknown) {
            if (err instanceof ZodError) {
                const errors: Partial<Record<keyof MaintenanceFormData, string>> = {};
                err.issues.forEach((issue) => {
                    const field = issue.path[0] as keyof MaintenanceFormData;
                    errors[field] = issue.message;
                });
                setFormErrors(errors);
                error('Please fix the form errors below.');
            } else {
                error('Failed to create ticket.');
                console.error(err);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            propertyId: "",
            tenantId: undefined,
            title: "",
            description: "",
            status: "open",
            priority: "medium",
            cost: undefined,
            assignedTo: undefined,
        });
        setFormErrors({});
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
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-50">Maintenance</h2>
                    <p className="text-zinc-400">Manage work orders and repairs</p>
                </div>
                <div className="flex gap-2">
                    <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as MaintenanceStatus | "all")}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Filter Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                    </Select>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={resetForm} className="flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                New Ticket
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-zinc-900 border-zinc-800 sm:max-w-[600px]">
                            <DialogHeader>
                                <DialogTitle>Create Maintenance Ticket</DialogTitle>
                                <DialogDescription>Submit a new maintenance request</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Title</Label>
                                    <Input
                                        id="title"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className={formErrors.title ? 'border-red-500' : ''}
                                        placeholder="e.g. Leaking faucet"
                                    />
                                    {formErrors.title && <p className="text-xs text-red-500">{formErrors.title}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="property">Property</Label>
                                        <Select
                                            value={formData.propertyId}
                                            onValueChange={(val) => setFormData({ ...formData, propertyId: val })}
                                        >
                                            <SelectTrigger id="property" className={formErrors.propertyId ? 'border-red-500' : ''}>
                                                <SelectValue placeholder="Select property" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {properties.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {formErrors.propertyId && <p className="text-xs text-red-500">{formErrors.propertyId}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="priority">Priority</Label>
                                        <Select
                                            value={formData.priority}
                                            onValueChange={(val) => setFormData({ ...formData, priority: val as MaintenancePriority })}
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
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className={formErrors.description ? 'border-red-500' : ''}
                                        placeholder="Detailed description of the issue..."
                                        rows={4}
                                    />
                                    {formErrors.description && <p className="text-xs text-red-500">{formErrors.description}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="assignedTo">Assigned To (Optional)</Label>
                                        <Input
                                            id="assignedTo"
                                            value={formData.assignedTo || ''}
                                            onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
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
                                            value={formData.cost || ''}
                                            onChange={(e) => setFormData({ ...formData, cost: e.target.value ? parseFloat(e.target.value) : undefined })}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-4">
                                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                    <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Ticket'}</Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredTickets.length === 0 ? (
                    <div className="col-span-full">
                        <Card className="bg-zinc-900 border-zinc-800">
                            <CardContent className="p-8 text-center">
                                <Hammer className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-zinc-50 mb-2">No maintenance tickets</h3>
                                <p className="text-zinc-400 mb-4">Create a new ticket to track maintenance requests</p>
                                <Button onClick={() => { resetForm(); setIsDialogOpen(true) }} className="flex items-center gap-2">
                                    <Plus className="w-4 h-4" />
                                    Create Ticket
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    filteredTickets.map(ticket => (
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
                                            <DropdownMenuItem className="text-zinc-300 focus:bg-zinc-800 cursor-pointer">Edit Details</DropdownMenuItem>
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
    );
}
