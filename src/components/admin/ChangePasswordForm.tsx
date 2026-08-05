"use client";

import { FormEvent, useState } from "react";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("Xác nhận mật khẩu không khớp");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Đổi mật khẩu thất bại");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Đã đổi mật khẩu thành công.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đổi mật khẩu thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-md space-y-4 rounded-lg border border-[#ece4f3] bg-white p-4 md:p-5"
    >
      {error ? (
        <p className="rounded bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded bg-emerald-50 px-3 py-2 text-[13px] text-emerald-700">
          {success}
        </p>
      ) : null}

      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-[#666]">
          Mật khẩu hiện tại
        </span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[14px] outline-none focus:border-brand"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-[#666]">
          Mật khẩu mới (tối thiểu 8 ký tự)
        </span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[14px] outline-none focus:border-brand"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-[#666]">
          Xác nhận mật khẩu mới
        </span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[14px] outline-none focus:border-brand"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="rounded bg-brand px-4 py-2 text-[14px] font-bold text-white disabled:opacity-60"
      >
        {loading ? "Đang lưu…" : "Đổi mật khẩu"}
      </button>
    </form>
  );
}
