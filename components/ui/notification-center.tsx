"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  X,
  Check,
  CheckCheck,
  AlertTriangle,
  DollarSign,
  Wrench,
  FileText,
  Calendar,
  Users,
  Building2,
  Trash2,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Button } from "./button";
import { Badge } from "./badge";
import { Separator } from "./separator";
import * as Popover from "@radix-ui/react-popover";

// Types
export type NotificationType = 
  | "payment_overdue" 
  | "payment_received" 
  | "maintenance_new"
  | "maintenance_update"
  | "lease_expiring"
  | "lease_expired"
  | "tenant_added"
  | "document_uploaded"
  | "system";

export type NotificationPriority = "low" | "medium" | "high" | "urgent";

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onNotificationClick?: (notification: Notification) => void;
  className?: string;
}

// Icon mapping for notification types
const notificationIcons: Record<NotificationType, React.ElementType> = {
  payment_overdue: DollarSign,
  payment_received: DollarSign,
  maintenance_new: Wrench,
  maintenance_update: Wrench,
  lease_expiring: Calendar,
  lease_expired: FileText,
  tenant_added: Users,
  document_uploaded: FileText,
  system: Bell,
};

// Color mapping for notification types
const notificationColors: Record<NotificationType, string> = {
  payment_overdue: "text-red-400 bg-red-400/10",
  payment_received: "text-green-400 bg-green-400/10",
  maintenance_new: "text-orange-400 bg-orange-400/10",
  maintenance_update: "text-blue-400 bg-blue-400/10",
  lease_expiring: "text-yellow-400 bg-yellow-400/10",
  lease_expired: "text-red-400 bg-red-400/10",
  tenant_added: "text-purple-400 bg-purple-400/10",
  document_uploaded: "text-blue-400 bg-blue-400/10",
  system: "text-zinc-400 bg-zinc-400/10",
};

// Priority badge colors
const priorityColors: Record<NotificationPriority, string> = {
  low: "bg-zinc-500/20 text-zinc-400",
  medium: "bg-blue-500/20 text-blue-400",
  high: "bg-orange-500/20 text-orange-400",
  urgent: "bg-red-500/20 text-red-400",
};

// Format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Single notification item
function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onClick,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClick?: (notification: Notification) => void;
}): React.ReactElement {
  const Icon = notificationIcons[notification.type];
  const colorClass = notificationColors[notification.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={cn(
        "group relative flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors",
        notification.read 
          ? "bg-transparent hover:bg-[var(--color-hover)]" 
          : "bg-[var(--color-surface-elevated)] hover:bg-[var(--color-hover)]"
      )}
      onClick={() => {
        if (!notification.read) {
          onMarkAsRead(notification.id);
        }
        onClick?.(notification);
      }}
    >
      {/* Unread indicator */}
      {!notification.read && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent-primary" />
      )}

      {/* Icon */}
      <div className={cn("p-2 rounded-lg shrink-0", colorClass)}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <p className={cn(
            "text-sm font-medium truncate",
            notification.read ? "text-[var(--color-muted-foreground)]" : "text-[var(--color-foreground)]"
          )}>
            {notification.title}
          </p>
          {notification.priority !== "low" && (
            <Badge className={cn("text-[10px] px-1.5 py-0", priorityColors[notification.priority])}>
              {notification.priority}
            </Badge>
          )}
        </div>
        <p className="text-xs text-[var(--color-muted-foreground)] line-clamp-2">
          {notification.message}
        </p>
        <p className="text-[10px] text-[var(--color-muted-foreground)]">
          {formatRelativeTime(notification.timestamp)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.read && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(notification.id);
            }}
            title="Mark as read"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

// Main notification center component
export function NotificationCenter({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
  onNotificationClick,
  className,
}: NotificationCenterProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifications = filter === "unread" 
    ? notifications.filter((n) => !n.read)
    : notifications;

  // Sort by timestamp (newest first) and then by priority
  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    const priorityOrder: Record<NotificationPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    if (!a.read && b.read) return -1;
    if (a.read && !b.read) return 1;
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-9 w-9 p-0"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="w-full max-w-md sm:w-96 max-h-[calc(100vh-5rem)] z-[var(--z-popover)] rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xl overflow-hidden flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-[var(--color-border)] flex-none">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[var(--color-foreground)]">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={onMarkAllAsRead}
                  aria-label="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5 mr-1" />
                  Mark all read
                </Button>
              )}
              <Popover.Close asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  aria-label="Close notifications"
                >
                  <X className="h-4 w-4" />
                </Button>
              </Popover.Close>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 p-2 border-b border-[var(--color-border)] flex-none">
            <Button
              variant={filter === "all" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFilter("all")}
            >
              All ({notifications.length})
            </Button>
            <Button
              variant={filter === "unread" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFilter("unread")}
            >
              Unread ({unreadCount})
            </Button>
          </div>

          {/* Notification list */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto scrollbar-thin">
              {sortedNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="h-10 w-10 text-[var(--color-muted-foreground)] mb-3" />
                  <p className="text-sm font-medium text-[var(--color-foreground)]">
                    {filter === "unread" ? "No unread notifications" : "No notifications"}
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {filter === "unread" 
                      ? "You're all caught up!" 
                      : "Notifications will appear here"}
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  <AnimatePresence mode="popLayout">
                    {sortedNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={onMarkAsRead}
                        onDelete={onDelete}
                        onClick={onNotificationClick}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="flex items-center justify-between p-2 border-t border-[var(--color-border)] flex-none">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={onClearAll}
                aria-label="Clear all notifications"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Clear all
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                aria-label="Notification settings"
              >
                <Settings className="h-3.5 w-3.5 mr-1" />
                Settings
              </Button>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// Hook to manage notifications state
export function useNotifications(initialNotifications: Notification[] = []) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  const addNotification = useCallback((notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
    };
    setNotifications((prev) => [newNotification, ...prev]);
    return newNotification.id;
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    unreadCount: notifications.filter((n) => !n.read).length,
  };
}

// Sample notifications for demo
export function getSampleNotifications(): Notification[] {
  const now = new Date();
  return [
    {
      id: "1",
      type: "payment_overdue",
      priority: "urgent",
      title: "Payment Overdue",
      message: "Unit 3A rent payment is 15 days overdue. Amount: €850.00",
      timestamp: new Date(now.getTime() - 1000 * 60 * 30), // 30 mins ago
      read: false,
    },
    {
      id: "2",
      type: "maintenance_new",
      priority: "high",
      title: "New Maintenance Request",
      message: "Water leak reported in Unit 2B kitchen. Tenant marked as urgent.",
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 2), // 2 hours ago
      read: false,
    },
    {
      id: "3",
      type: "lease_expiring",
      priority: "medium",
      title: "Lease Expiring Soon",
      message: "Lease for Maria Santos (Unit 1A) expires in 30 days.",
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 24), // 1 day ago
      read: false,
    },
    {
      id: "4",
      type: "payment_received",
      priority: "low",
      title: "Payment Received",
      message: "€750.00 received from João Silva for Unit 4B",
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 48), // 2 days ago
      read: true,
    },
    {
      id: "5",
      type: "tenant_added",
      priority: "low",
      title: "New Tenant Added",
      message: "Ana Ferreira added as tenant for Unit 5C",
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 72), // 3 days ago
      read: true,
    },
  ];
}
