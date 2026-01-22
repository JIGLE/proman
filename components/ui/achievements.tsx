import { motion } from "framer-motion";
import { CheckCircle, Star, Trophy, Target } from "lucide-react";

interface AchievementBadgeProps {
  type: 'occupancy' | 'payments' | 'lease' | 'property';
  earned: boolean;
  title: string;
  description: string;
  className?: string;
}

export function AchievementBadge({
  type,
  earned,
  title,
  description,
  className = ""
}: AchievementBadgeProps) {
  const getIcon = () => {
    switch (type) {
      case 'occupancy':
        return <Target className="h-4 w-4" />;
      case 'payments':
        return <CheckCircle className="h-4 w-4" />;
      case 'lease':
        return <Trophy className="h-4 w-4" />;
      case 'property':
        return <Star className="h-4 w-4" />;
      default:
        return <Star className="h-4 w-4" />;
    }
  };

  const getColors = () => {
    if (!earned) return { bg: 'bg-zinc-800', border: 'border-zinc-700', text: 'text-zinc-500' };

    switch (type) {
      case 'occupancy':
        return { bg: 'bg-progress/10', border: 'border-progress/30', text: 'text-progress' };
      case 'payments':
        return { bg: 'bg-success/10', border: 'border-success/30', text: 'text-success' };
      case 'lease':
        return { bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning' };
      case 'property':
        return { bg: 'bg-accent-primary/10', border: 'border-accent-primary/30', text: 'text-accent-primary' };
      default:
        return { bg: 'bg-zinc-800', border: 'border-zinc-700', text: 'text-zinc-500' };
    }
  };

  const colors = getColors();

  return (
    <motion.div
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${colors.bg} ${colors.border} ${colors.text} ${className}`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={earned ? { scale: 1.05 } : {}}
      transition={{ type: "spring", stiffness: 300 }}
      title={earned ? description : `${title} - Not yet earned`}
    >
      <motion.div
        animate={earned ? { rotate: [0, 10, -10, 0] } : {}}
        transition={{ duration: 0.5, delay: Math.random() * 2 }}
      >
        {getIcon()}
      </motion.div>
      <span className="text-sm font-medium">{title}</span>
      {earned && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          <CheckCircle className="h-3 w-3" />
        </motion.div>
      )}
    </motion.div>
  );
}

interface AchievementGridProps {
  occupancyRate: number;
  totalPayments: number;
  totalProperties: number;
  overduePayments: number;
  className?: string;
}

export function AchievementGrid({
  occupancyRate,
  totalPayments,
  totalProperties,
  overduePayments,
  className = ""
}: AchievementGridProps) {
  const achievements = [
    {
      type: 'occupancy' as const,
      earned: occupancyRate >= 90,
      title: 'Full Occupancy',
      description: '90% or higher occupancy rate',
    },
    {
      type: 'payments' as const,
      earned: overduePayments === 0 && totalPayments > 0,
      title: 'Perfect Payments',
      description: 'No overdue payments this month',
    },
    {
      type: 'property' as const,
      earned: totalProperties >= 10,
      title: 'Property Manager',
      description: 'Manage 10+ properties',
    },
    {
      type: 'lease' as const,
      earned: totalProperties > 0 && overduePayments === 0,
      title: 'Lease Master',
      description: 'All leases performing well',
    },
  ];

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {achievements.map((achievement, index) => (
        <motion.div
          key={achievement.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <AchievementBadge {...achievement} />
        </motion.div>
      ))}
    </div>
  );
}