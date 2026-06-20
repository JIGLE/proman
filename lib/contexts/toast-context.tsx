"use client";

import { createContext, useContext, useCallback, useMemo, ReactNode } from "react";
import toast, { Toaster, Toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Info, Sparkles } from "lucide-react";
import { spring } from "@/lib/motion-variants";

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
  celebrate: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Custom animated toast component
const AnimatedToast = ({
  t,
  message,
  type,
}: {
  t: Toast;
  message: string;
  type: "success" | "error" | "info" | "warning";
}) => {
  const getConfig = () => {
    switch (type) {
      case "success":
        return {
          icon: CheckCircle,
          bgColor: "var(--color-success)",
          textColor: "var(--color-success-foreground)",
          duration: 4000,
        };
      case "error":
        return {
          icon: XCircle,
          bgColor: "var(--color-destructive)",
          textColor: "var(--color-destructive-foreground)",
          duration: 5000,
        };
      case "warning":
        return {
          icon: AlertTriangle,
          bgColor: "var(--color-warning)",
          textColor: "var(--color-warning-foreground)",
          duration: 4500,
        };
      default:
        return {
          icon: Info,
          bgColor: "var(--color-info)",
          textColor: "var(--color-info-foreground)",
          duration: 4000,
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        role={type === "error" ? "alert" : "status"}
        aria-live={type === "error" ? "assertive" : "polite"}
        aria-atomic="true"
        initial={{ x: 400, opacity: 0, scale: 0.8 }}
        animate={{ x: 0, opacity: 1, scale: 1 }}
        exit={{ x: 400, opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
        transition={spring}
        className="relative overflow-hidden rounded-lg border shadow-lg backdrop-blur-sm"
        style={{
          backgroundColor: config.bgColor + "15",
          borderColor: config.bgColor + "30",
          color: config.textColor,
          minWidth: "320px",
        }}
      >
        {/* Progress bar */}
        <motion.div
          className="absolute bottom-0 left-0 h-1 rounded-b-lg"
          style={{ backgroundColor: config.bgColor }}
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: config.duration / 1000, ease: "linear" }}
          aria-hidden="true"
        />

        <div className="flex items-center gap-3 p-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring" }}
            aria-hidden="true"
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
          </motion.div>

          <div className="flex-1 text-sm font-medium leading-tight">{message}</div>

          <motion.button
            onClick={() => toast.dismiss(t.id)}
            className="flex-shrink-0 text-current/60 hover:text-current transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Close notification"
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

const CelebrationToast = ({ t, message }: { t: Toast; message: string }) => (
  <AnimatePresence>
    <motion.div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      initial={{ y: 40, opacity: 0, scale: 0.85 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 40, opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
      transition={spring}
      className="relative overflow-hidden rounded-xl border shadow-lg backdrop-blur-sm"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--color-success) 10%, transparent), color-mix(in srgb, var(--color-primary) 6%, transparent))",
        borderColor: "color-mix(in srgb, var(--color-success) 25%, transparent)",
        minWidth: "320px",
      }}
    >
      <motion.div
        className="absolute bottom-0 left-0 h-1 rounded-b-xl"
        style={{ backgroundColor: "var(--color-success)" }}
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: 4, ease: "linear" }}
        aria-hidden="true"
      />
      <div className="flex items-center gap-3 p-4">
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: [0, 1.3, 1], rotate: [-30, 10, 0] }}
          transition={{ delay: 0.05, ...spring }}
          aria-hidden="true"
        >
          <Sparkles className="h-5 w-5 text-[var(--color-success)]" />
        </motion.div>
        <div className="flex-1 text-sm font-semibold leading-tight text-[var(--color-foreground)]">
          {message}
        </div>
        <motion.button
          onClick={() => toast.dismiss(t.id)}
          className="flex-shrink-0 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Close notification"
        >
          ×
        </motion.button>
      </div>
    </motion.div>
  </AnimatePresence>
);

async function fireConfetti() {
  try {
    const confetti = (await import("canvas-confetti")).default;
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
      colors: ["#14b8a6", "#0ea5e9", "#a855f7", "#f59e0b", "#22c55e"],
      scalar: 0.9,
    });
  } catch {
    // Ignore if canvas-confetti fails (SSR or blocked)
  }
}

export function ToastProvider({ children }: { children: ReactNode }): React.ReactElement {
  const success = useCallback(
    (message: string) =>
      toast.custom((t) => <AnimatedToast t={t} message={message} type="success" />, {
        duration: 4000,
      }),
    [],
  );
  const error = useCallback(
    (message: string) =>
      toast.custom((t) => <AnimatedToast t={t} message={message} type="error" />, {
        duration: 5000,
      }),
    [],
  );
  const info = useCallback(
    (message: string) =>
      toast.custom((t) => <AnimatedToast t={t} message={message} type="info" />, {
        duration: 4000,
      }),
    [],
  );
  const warning = useCallback(
    (message: string) =>
      toast.custom((t) => <AnimatedToast t={t} message={message} type="warning" />, {
        duration: 4500,
      }),
    [],
  );

  const celebrate = useCallback((message: string) => {
    toast.custom((t) => <CelebrationToast t={t} message={message} />, { duration: 4000 });
    fireConfetti();
  }, []);

  const value = useMemo(
    () => ({ success, error, info, warning, celebrate }),
    [success, error, info, warning, celebrate],
  );

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
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
