"use client";

import { FormEvent, useEffect, useState } from "react";
import { isCmsUser } from "@/lib/admin/auth";
import { createAuthBrowserClient } from "@/lib/supabase/browser";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "forbidden") {
      setError(
        "Tài khoản chưa có quyền CMS (role: super_admin / editor / author / viewer).",
      );
    }
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const next =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("next") || "/admin"
        : "/admin";

    const supabase = createAuthBrowserClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      setError(signInError.message);
      return;
    }

    if (!data.session || !data.user) {
      setLoading(false);
      setError("Không tạo được phiên đăng nhập.");
      return;
    }

    if (!isCmsUser(data.user)) {
      await supabase.auth.signOut();
      setLoading(false);
      setError(
        "Tài khoản chưa có quyền CMS. Cần app_metadata.role hợp lệ (super_admin, editor, author, viewer).",
      );
      return;
    }

    // Hard navigation so middleware receives auth cookies reliably.
    window.location.assign(next.startsWith("/") ? next : "/admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f4f8] px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-lg border border-border-light bg-white p-6 shadow-sm"
      >
        <h1 className="mb-1 text-[22px] font-bold">CMS Login</h1>
        <p className="mb-6 text-[13px] text-[#666]">
          Chỉ tài khoản có role <code>admin</code> mới vào được CMS.
        </p>

        <label className="mb-4 block">
          <span className="mb-1 block text-[13px] font-medium">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[14px] outline-none focus:border-brand"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block text-[13px] font-medium">Mật khẩu</span>
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[14px] outline-none focus:border-brand"
          />
        </label>

        {error ? (
          <p className="mb-4 rounded bg-red-50 px-3 py-2 text-[13px] text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-brand px-4 py-2.5 text-[14px] font-bold text-white disabled:opacity-60"
        >
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </div>
  );
}
