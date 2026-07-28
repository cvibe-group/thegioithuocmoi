"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};

type ConfirmState = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmOptions & {
  open: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="w-full max-w-[420px] rounded-lg border border-border-light bg-white shadow-lg"
      >
        <div className="flex gap-3 border-b border-border-light px-5 py-4">
          {tone === "danger" ? (
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="size-4" />
            </div>
          ) : null}
          <div className="min-w-0">
            <h2 id={titleId} className="text-[16px] font-bold text-[#0a0a0a]">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-[13px] leading-relaxed text-[#666]">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4">
          <button
            ref={cancelRef}
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded border border-border-light bg-white px-4 py-2 text-[13px] font-medium text-[#444] hover:bg-brand-light hover:text-brand disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={
              tone === "danger"
                ? "rounded bg-red-600 px-4 py-2 text-[13px] font-bold text-white hover:bg-red-700 disabled:opacity-50"
                : "rounded bg-brand px-4 py-2 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-50"
            }
          >
            {busy ? "Đang xử lý…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, resolve });
    });
  }, []);

  const close = useCallback((value: boolean) => {
    setState((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

  const dialog = (
    <ConfirmDialog
      open={Boolean(state)}
      title={state?.title ?? ""}
      description={state?.description}
      confirmLabel={state?.confirmLabel ?? "Xóa"}
      cancelLabel={state?.cancelLabel ?? "Hủy"}
      tone={state?.tone ?? "danger"}
      onCancel={() => close(false)}
      onConfirm={() => close(true)}
    />
  );

  return { confirm, dialog };
}
