"use client";

import * as React from "react";
import { cn } from "@/lib/utils/utils";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LeaseEvent {
  id: string;
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  date: string;
  type: 'expiration' | 'renewal' | 'start';
  status: 'expired' | 'critical' | 'warning' | 'healthy';
  monthlyRent?: number;
}

interface LeaseCalendarProps {
  events: LeaseEvent[];
  className?: string;
  onEventClick?: (event: LeaseEvent) => void;
  onMonthChange?: (month: number, year: number) => void;
}

export function LeaseCalendar({ 
  events, 
  className,
  onEventClick,
  onMonthChange 
}: LeaseCalendarProps) {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  
  // Get previous month's trailing days
  const prevMonthDays = new Date(year, month, 0).getDate();

  // Navigate months
  const goToPrevMonth = () => {
    const newDate = new Date(year, month - 1, 1);
    setCurrentDate(newDate);
    onMonthChange?.(newDate.getMonth(), newDate.getFullYear());
  };

  const goToNextMonth = () => {
    const newDate = new Date(year, month + 1, 1);
    setCurrentDate(newDate);
    onMonthChange?.(newDate.getMonth(), newDate.getFullYear());
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
    onMonthChange?.(today.getMonth(), today.getFullYear());
  };

  // Get events for a specific date
  const getEventsForDate = React.useCallback((day: number): LeaseEvent[] => {
    const dateStr = new Date(year, month, day).toISOString().split('T')[0];
    return events.filter(event => event.date.startsWith(dateStr));
  }, [year, month, events]);

  // Get status color
  const getStatusColor = (status: LeaseEvent['status']) => {
    switch (status) {
      case 'expired': return 'bg-red-500';
      case 'critical': return 'bg-orange-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  // Generate calendar days
  const calendarDays = React.useMemo(() => {
    const days: { day: number; isCurrentMonth: boolean; isToday: boolean; events: LeaseEvent[] }[] = [];
    const today = new Date();

    // Previous month's trailing days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        isToday: false,
        events: []
      });
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = 
        day === today.getDate() && 
        month === today.getMonth() && 
        year === today.getFullYear();
      
      days.push({
        day,
        isCurrentMonth: true,
        isToday,
        events: getEventsForDate(day)
      });
    }

    // Next month's leading days
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        day,
        isCurrentMonth: false,
        isToday: false,
        events: []
      });
    }

    return days;
  }, [year, month, daysInMonth, firstDayOfMonth, prevMonthDays, getEventsForDate]);

  // Selected date events
  const selectedDateEvents = selectedDate 
    ? events.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate.getDate() === selectedDate.getDate() &&
               eventDate.getMonth() === selectedDate.getMonth() &&
               eventDate.getFullYear() === selectedDate.getFullYear();
      })
    : [];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <Card className={cn("p-6", className)}>
      <CardHeader className="p-0 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-zinc-50 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-400" />
            Lease Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-zinc-200 min-w-[120px] text-center">
              {monthNames[month]} {year}
            </span>
            <Button variant="ghost" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="grid grid-cols-7 gap-1">
          {/* Week day headers */}
          {weekDays.map(day => (
            <div 
              key={day} 
              className="text-center text-xs font-medium text-zinc-500 py-2"
            >
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((dayInfo, index) => (
            <motion.button
              key={index}
              onClick={() => {
                if (dayInfo.isCurrentMonth) {
                  setSelectedDate(new Date(year, month, dayInfo.day));
                }
              }}
              whileHover={{ scale: dayInfo.isCurrentMonth ? 1.05 : 1 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "relative aspect-square p-1 rounded-lg transition-colors text-sm",
                dayInfo.isCurrentMonth 
                  ? "hover:bg-zinc-800 cursor-pointer" 
                  : "text-zinc-600 cursor-default",
                dayInfo.isToday && "bg-accent-primary/20 text-accent-primary font-bold",
                selectedDate && 
                  dayInfo.isCurrentMonth && 
                  dayInfo.day === selectedDate.getDate() && 
                  month === selectedDate.getMonth() &&
                  "bg-accent-primary text-white"
              )}
            >
              <span className="block text-center">{dayInfo.day}</span>
              
              {/* Event indicators */}
              {dayInfo.events.length > 0 && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {dayInfo.events.slice(0, 3).map((event, i) => (
                    <div
                      key={i}
                      className={cn("w-1.5 h-1.5 rounded-full", getStatusColor(event.status))}
                    />
                  ))}
                  {dayInfo.events.length > 3 && (
                    <span className="text-[8px] text-zinc-400">+{dayInfo.events.length - 3}</span>
                  )}
                </div>
              )}
            </motion.button>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>Expired</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <span>Critical (&lt;30d)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>Warning (30-60d)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>Healthy (&gt;60d)</span>
          </div>
        </div>

        {/* Selected date events */}
        <AnimatePresence>
          {selectedDate && selectedDateEvents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-zinc-800"
            >
              <h4 className="text-sm font-medium text-zinc-300 mb-3">
                Events on {selectedDate.toLocaleDateString()}
              </h4>
              <div className="space-y-2">
                {selectedDateEvents.map((event, index) => {
                  const StatusIcon = event.status === 'expired' ? AlertTriangle 
                    : event.status === 'critical' ? Clock 
                    : CheckCircle2;
                  
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => onEventClick?.(event)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 cursor-pointer hover:bg-zinc-800 transition-colors",
                        onEventClick && "cursor-pointer"
                      )}
                    >
                      <div className={cn("w-1 h-10 rounded-full", getStatusColor(event.status))} />
                      <StatusIcon className={cn(
                        "h-4 w-4",
                        event.status === 'expired' ? "text-red-400" :
                        event.status === 'critical' ? "text-orange-400" :
                        event.status === 'warning' ? "text-yellow-400" : "text-green-400"
                      )} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-zinc-200">{event.tenantName}</p>
                        <p className="text-xs text-zinc-400">
                          {event.propertyName} - Unit {event.unitNumber}
                        </p>
                      </div>
                      <Badge variant={
                        event.status === 'expired' ? 'destructive' :
                        event.status === 'critical' ? 'warning' :
                        event.status === 'warning' ? 'secondary' : 'success'
                      }>
                        {event.type === 'expiration' ? 'Expires' : event.type === 'renewal' ? 'Renewal' : 'Starts'}
                      </Badge>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// Mini Calendar for sidebar or compact views
interface MiniCalendarProps {
  events: LeaseEvent[];
  className?: string;
}

export function MiniLeaseCalendar({ events, className }: MiniCalendarProps) {
  const today = new Date();
  const upcomingEvents = events
    .filter(e => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const expiredCount = events.filter(e => e.status === 'expired').length;
  const criticalCount = events.filter(e => e.status === 'critical').length;
  const warningCount = events.filter(e => e.status === 'warning').length;

  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-zinc-50 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-purple-400" />
          Lease Status
        </h4>
      </div>

      {/* Summary badges */}
      <div className="flex gap-2 mb-4">
        {expiredCount > 0 && (
          <Badge variant="destructive" size="sm">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {expiredCount} Expired
          </Badge>
        )}
        {criticalCount > 0 && (
          <Badge variant="warning" size="sm">
            <Clock className="h-3 w-3 mr-1" />
            {criticalCount} Critical
          </Badge>
        )}
        {warningCount > 0 && (
          <Badge variant="secondary" size="sm">
            {warningCount} Warning
          </Badge>
        )}
      </div>

      {/* Upcoming events list */}
      <div className="space-y-2">
        {upcomingEvents.length === 0 ? (
          <p className="text-xs text-zinc-500">No upcoming lease expirations</p>
        ) : (
          upcomingEvents.map(event => (
            <div 
              key={event.id}
              className="flex items-center gap-2 text-xs"
            >
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                event.status === 'critical' ? "bg-orange-500" :
                event.status === 'warning' ? "bg-yellow-500" : "bg-green-500"
              )} />
              <span className="text-zinc-400 truncate flex-1">{event.tenantName}</span>
              <span className="text-zinc-500">
                {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
