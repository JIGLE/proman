"use client";

import { createContext, useContext, ReactNode } from 'react';
import toast, { Toaster, Toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Custom animated toast component
const AnimatedToast = ({ t, message, type }: { t: Toast; message: string; type: 'success' | 'error' | 'info' | 'warning' }) => {
  const getConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          bgColor: 'var(--color-success)',
          textColor: 'var(--color-success-foreground)',
          duration: 4000,
        };
      case 'error':
        return {
          icon: XCircle,
          bgColor: 'var(--color-destructive)',
          textColor: 'var(--color-destructive-foreground)',
          duration: 5000,
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'var(--color-warning)',
          textColor: 'var(--color-warning-foreground)',
          duration: 4500,
        };
      default:
        return {
          icon: Info,
          bgColor: 'var(--color-info)',
          textColor: 'var(--color-info-foreground)',
          duration: 4000,
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 400, opacity: 0, scale: 0.8 }}
        animate={{ x: 0, opacity: 1, scale: 1 }}
        exit={{ x: 400, opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30
        }}
        className="relative overflow-hidden rounded-lg border shadow-lg backdrop-blur-sm"
        style={{
          backgroundColor: config.bgColor + '15',
          borderColor: config.bgColor + '30',
          color: config.textColor,
          minWidth: '320px',
        }}
      >
        {/* Progress bar */}
        <motion.div
          className="absolute bottom-0 left-0 h-1 rounded-b-lg"
          style={{ backgroundColor: config.bgColor }}
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: config.duration / 1000, ease: "linear" }}
        />

        <div className="flex items-center gap-3 p-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring" }}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
          </motion.div>

          <div className="flex-1 text-sm font-medium leading-tight">
            {message}
          </div>

          <motion.button
            onClick={() => toast.dismiss(t.id)}
            className="flex-shrink-0 text-current/60 hover:text-current transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            ×
          </motion.button>
        </div>

        {/* Subtle glow effect */}
        <div
          className="absolute inset-0 rounded-lg opacity-20"
          style={{
            background: `linear-gradient(135deg, ${config.bgColor}20, transparent)`,
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
};

export function ToastProvider({ children }: { children: ReactNode }): React.ReactElement {
  const value: ToastContextType = {
    success: (message: string) => toast.custom((t) => <AnimatedToast t={t} message={message} type="success" />, {
      duration: 4000,
    }),
    error: (message: string) => toast.custom((t) => <AnimatedToast t={t} message={message} type="error" />, {
      duration: 5000,
    }),
    info: (message: string) => toast.custom((t) => <AnimatedToast t={t} message={message} type="info" />, {
      duration: 4000,
    }),
    warning: (message: string) => toast.custom((t) => <AnimatedToast t={t} message={message} type="warning" />, {
      duration: 4500,
    }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
        }}
      />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
