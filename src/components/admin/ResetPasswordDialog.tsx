"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { KeyRound } from "lucide-react";

type ResetPasswordDialogProps = {
  open: boolean;
  email: string;
  busy?: boolean;
  onCancel: () => void;
  onSubmit: (password: string) => void | Promise<void>;
};

export function ResetPasswordDialog({
  open,
  email,
  busy = false,
  onCancel,
  onSubmit,
}: ResetPasswordDialogProps) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPassword("");
    setConfirm("");
    setLocalError(null);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);
    const next = password.trim();
    if (next.length < 8) {
      setLocalError("Mật khẩu tối thiểu 8 ký tự");
      return;
    }
    if (next !== confirm) {
      setLocalError("Xác nhận mật khẩu không khớp");
      return;
    }
    await onSubmit(next);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[420px] rounded-lg border border-border-light bg-white shadow-lg"
      >
        <div className="flex gap-3 border-b border-border-light px-5 py-4">
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand">
            <KeyRound className="size-4" />
          </div>
          <div className="min-w-0">
            <h2 id={titleId} className="text-[16px] font-bold text-[#0a0a0a]">
              Cấp lại mật khẩu
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[#666]">
              Đặt mật khẩu mới cho <span className="font-medium text-[#333]">{email}</span>.
              User dùng mật khẩu này để đăng nhập.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 px-5 py-4">
          {localError ? (
            <p className="rounded bg-red-50 px-3 py-2 text-[13px] text-red-700">
              {localError}
            </p>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-[#666]">
              Mật khẩu mới
            </span>
            <input
              ref={inputRef}
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              disabled={busy}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[14px] outline-none focus:border-brand disabled:opacity-60"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-[#666]">
              Xác nhận mật khẩu
            </span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              disabled={busy}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[14px] outline-none focus:border-brand disabled:opacity-60"
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="rounded border border-border-light bg-white px-4 py-2 text-[13px] font-medium text-[#444] hover:bg-brand-light hover:text-brand disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-brand px-4 py-2 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Đang cấp…" : "Cấp mật khẩu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
