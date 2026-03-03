"use client";

import { motion } from "framer-motion";

interface ProgressBarProps {
  progress: number; // 0-100
  height?: number;
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  animated?: boolean;
  className?: string;
}

export function ProgressBar({
  progress,
  height = 8,
  color = "var(--color-progress)",
  backgroundColor = "var(--color-muted)",
  showPercentage = false,
  animated = true,
  className = "",
}: ProgressBarProps) {
  return (
    <div className={`w-full ${className}`}>
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height, backgroundColor }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: animated ? "0%" : `${progress}%` }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: animated ? 1 : 0, ease: "easeOut" }}
        />
      </div>
      {showPercentage && (
        <motion.div
          className="text-right mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <span className="text-xs text-zinc-400">{Math.round(progress)}%</span>
        </motion.div>
      )}
    </div>
  );
}
