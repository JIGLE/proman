"use client";

import { useState, useCallback, useRef } from "react";

export interface ConfirmDialogOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  /** Number of items being affected (shown as count badge) */
  count?: number;
}

interface ConfirmDialogState extends ConfirmDialogOptions {
  isOpen: boolean;
  isLoading: boolean;
}

export interface UseConfirmDialogReturn {
  state: ConfirmDialogState;
  confirm: (
    options: ConfirmDialogOptions,
    onConfirm: () => Promise<void>,
  ) => void;
  cancel: () => void;
  /** Internal — called by ConfirmationDialog when user clicks confirm */
  handleConfirm: () => Promise<void>;
}

const defaultState: ConfirmDialogState = {
  isOpen: false,
  isLoading: false,
  title: "",
  description: "",
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  variant: "default",
};

export function useConfirmDialog(): UseConfirmDialogReturn {
  const [state, setState] = useState<ConfirmDialogState>(defaultState);
  const onConfirmRef = useRef<(() => Promise<void>) | null>(null);

  const confirm = useCallback(
    (options: ConfirmDialogOptions, onConfirm: () => Promise<void>) => {
      onConfirmRef.current = onConfirm;
      setState({
        isOpen: true,
        isLoading: false,
        title: options.title,
        description: options.description,
        confirmLabel: options.confirmLabel ?? "Confirm",
        cancelLabel: options.cancelLabel ?? "Cancel",
        variant: options.variant ?? "default",
        count: options.count,
      });
    },
    [],
  );

  const cancel = useCallback(() => {
    setState(defaultState);
    onConfirmRef.current = null;
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!onConfirmRef.current) return;
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      await onConfirmRef.current();
    } finally {
      setState(defaultState);
      onConfirmRef.current = null;
    }
  }, []);

  return { state, confirm, cancel, handleConfirm };
}
