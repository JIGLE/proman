import { motion } from "framer-motion";

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  className?: string;
}

export function ProgressRing({
  progress,
  size = 60,
  strokeWidth = 4,
  color = "var(--color-progress)",
  backgroundColor = "var(--color-muted)",
  showPercentage = true,
  className = ""
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={`relative ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      {showPercentage && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
        >
          <span className="text-sm font-semibold text-zinc-50">
            {Math.round(progress)}%
          </span>
        </motion.div>
      )}
    </div>
  );
}

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
  className = ""
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