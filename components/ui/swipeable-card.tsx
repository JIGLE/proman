"use client";

import * as React from "react";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { useSwipe } from "@/lib/hooks/use-swipe";
import { Trash2, Edit, MoreHorizontal } from "lucide-react";

interface SwipeAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: "red" | "blue" | "green" | "yellow" | "zinc";
}

interface SwipeableCardProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onSwipeComplete?: (direction: "left" | "right") => void;
  disabled?: boolean;
  className?: string;
}

const colorVariants = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  zinc: "bg-zinc-600",
};

/**
 * Swipeable card component for mobile lists
 * Reveals action buttons when swiped left or right
 */
export function SwipeableCard({
  children,
  leftActions = [],
  rightActions = [],
  onSwipeComplete,
  disabled = false,
  className,
}: SwipeableCardProps): React.ReactElement {
  const [offset, setOffset] = useState(0);
  const [isRevealed, setIsRevealed] = useState<"left" | "right" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const ACTION_WIDTH = 72; // Width per action button
  const maxLeftOffset = leftActions.length * ACTION_WIDTH;
  const maxRightOffset = rightActions.length * ACTION_WIDTH;

  const { handlers } = useSwipe({
    threshold: 30,
    preventScroll: true,
    onSwipeStart: () => {
      // Close any revealed state when starting new swipe
      if (isRevealed) {
        setOffset(0);
        setIsRevealed(null);
      }
    },
    onSwipeEnd: (direction) => {
      const absOffset = Math.abs(offset);
      
      if (direction === "left" && absOffset > ACTION_WIDTH / 2 && rightActions.length > 0) {
        setOffset(-maxRightOffset);
        setIsRevealed("left");
        onSwipeComplete?.("left");
      } else if (direction === "right" && absOffset > ACTION_WIDTH / 2 && leftActions.length > 0) {
        setOffset(maxLeftOffset);
        setIsRevealed("right");
        onSwipeComplete?.("right");
      } else {
        setOffset(0);
        setIsRevealed(null);
      }
    },
  });

  // Handle touch move to update offset
  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled) return;
    
    handlers.onTouchMove(e);
    
    const touch = e.touches[0];
    const startX = containerRef.current?.dataset.startX 
      ? parseFloat(containerRef.current.dataset.startX) 
      : touch.clientX;
    
    let newOffset = touch.clientX - startX;
    
    // Limit offset to max action widths with rubber band effect
    if (newOffset > maxLeftOffset) {
      newOffset = maxLeftOffset + (newOffset - maxLeftOffset) * 0.2;
    } else if (newOffset < -maxRightOffset) {
      newOffset = -maxRightOffset + (newOffset + maxRightOffset) * 0.2;
    }
    
    // Don't allow swiping in directions without actions
    if (newOffset > 0 && leftActions.length === 0) newOffset = 0;
    if (newOffset < 0 && rightActions.length === 0) newOffset = 0;
    
    setOffset(newOffset);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    if (containerRef.current) {
      containerRef.current.dataset.startX = e.touches[0].clientX.toString();
    }
    handlers.onTouchStart(e);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (disabled) return;
    handlers.onTouchEnd(e);
  };

  const handleClose = () => {
    setOffset(0);
    setIsRevealed(null);
  };

  const handleActionClick = (action: SwipeAction) => {
    action.onClick();
    handleClose();
  };

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-hidden rounded-xl", className)}
    >
      {/* Left actions (revealed when swiping right) */}
      {leftActions.length > 0 && (
        <div 
          className="absolute left-0 top-0 bottom-0 flex items-stretch"
          style={{ width: maxLeftOffset }}
        >
          {leftActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleActionClick(action)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 text-white transition-transform",
                "active:scale-95 touch-manipulation",
                colorVariants[action.color]
              )}
              style={{ width: ACTION_WIDTH }}
            >
              {action.icon}
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Right actions (revealed when swiping left) */}
      {rightActions.length > 0 && (
        <div 
          className="absolute right-0 top-0 bottom-0 flex items-stretch"
          style={{ width: maxRightOffset }}
        >
          {rightActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleActionClick(action)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 text-white transition-transform",
                "active:scale-95 touch-manipulation",
                colorVariants[action.color]
              )}
              style={{ width: ACTION_WIDTH }}
            >
              {action.icon}
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main content */}
      <div
        className={cn(
          "relative bg-zinc-900 transition-transform",
          isRevealed ? "duration-200" : "duration-0"
        )}
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={isRevealed ? handleClose : undefined}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Pre-configured swipeable card with edit/delete actions
 */
interface SwipeableListItemProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function SwipeableListItem({
  children,
  onEdit,
  onDelete,
  className,
}: SwipeableListItemProps): React.ReactElement {
  const rightActions: SwipeAction[] = [];
  
  if (onEdit) {
    rightActions.push({
      icon: <Edit className="h-5 w-5" />,
      label: "Edit",
      onClick: onEdit,
      color: "blue",
    });
  }
  
  if (onDelete) {
    rightActions.push({
      icon: <Trash2 className="h-5 w-5" />,
      label: "Delete",
      onClick: onDelete,
      color: "red",
    });
  }

  return (
    <SwipeableCard rightActions={rightActions} className={className}>
      {children}
    </SwipeableCard>
  );
}
