"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  CMS_ROLES,
  ROLE_LABELS,
  type CmsRole,
} from "@/lib/admin/auth";
import { useConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ResetPasswordDialog } from "@/components/admin/ResetPasswordDialog";
import { cn } from "@/lib/utils";

type AdminUserRow = {
  id: string;
  email: string;
  role: CmsRole | null;
  roleRaw: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  banned: boolean;
};

export function UsersAdminPanel({ currentUserId }: { currentUserId: string }) {
  const { confirm, dialog } = useConfirmDialog();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUserRow | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<CmsRole>("author");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      const data = (await res.json()) as {
        users?: AdminUserRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Không tải được danh sách");
      setUsers(data.users ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Tạo user thất bại");
      setEmail("");
      setPassword("");
      setRole("author");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tạo user thất bại");
    } finally {
      setCreating(false);
    }
  }

  async function changeRole(user: AdminUserRow, next: CmsRole) {
    if (user.role === next) return;
    setBusyId(user.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, role: next }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Đổi role thất bại");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đổi role thất bại");
    } finally {
      setBusyId(null);
    }
  }

  async function submitResetPassword(nextPassword: string) {
    if (!resetTarget) return;
    setBusyId(resetTarget.id);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: resetTarget.id, password: nextPassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Cấp lại mật khẩu thất bại");
      setSuccess(`Đã cấp mật khẩu mới cho ${resetTarget.email}`);
      setResetTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cấp lại mật khẩu thất bại");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleBan(user: AdminUserRow) {
    const nextBanned = !user.banned;
    const ok = await confirm({
      title: nextBanned ? "Khóa tài khoản?" : "Mở khóa tài khoản?",
      description: nextBanned
        ? `${user.email} sẽ không đăng nhập được.`
        : `${user.email} sẽ đăng nhập lại được.`,
      confirmLabel: nextBanned ? "Khóa" : "Mở khóa",
      tone: nextBanned ? "danger" : "default",
    });
    if (!ok) return;
    setBusyId(user.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, banned: nextBanned }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Cập nhật thất bại");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cập nhật thất bại");
    } finally {
      setBusyId(null);
    }
  }

  async function removeUser(user: AdminUserRow) {
    const ok = await confirm({
      title: "Xóa user?",
      description: `Xóa vĩnh viễn ${user.email}. Không thể hoàn tác.`,
      confirmLabel: "Xóa",
      tone: "danger",
    });
    if (!ok) return;
    setBusyId(user.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(user.id)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Xóa thất bại");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xóa thất bại");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      {dialog}
      <ResetPasswordDialog
        open={Boolean(resetTarget)}
        email={resetTarget?.email ?? ""}
        busy={Boolean(resetTarget && busyId === resetTarget.id)}
        onCancel={() => {
          if (resetTarget && busyId === resetTarget.id) return;
          setResetTarget(null);
        }}
        onSubmit={submitResetPassword}
      />
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

      <section className="rounded-lg border border-[#ece4f3] bg-white p-4 md:p-5">
        <h2 className="mb-3 text-[16px] font-bold">Tạo user mới</h2>
        <form
          onSubmit={onCreate}
          className="grid gap-3 md:grid-cols-2 lg:grid-cols-4"
        >
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-[#666]">
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[14px] outline-none focus:border-brand"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-[#666]">
              Mật khẩu (tối thiểu 8 ký tự)
            </span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[14px] outline-none focus:border-brand"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-[#666]">
              Role
            </span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as CmsRole)}
              className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[14px] outline-none focus:border-brand"
            >
              {CMS_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded bg-brand px-4 py-2 text-[14px] font-bold text-white disabled:opacity-60"
            >
              {creating ? "Đang tạo…" : "Tạo user"}
            </button>
          </div>
        </form>
        <p className="mt-3 text-[12px] text-[#888]">
          Super Admin: toàn quyền. Editor: nội dung & cấu trúc. Author: bài viết
          + media. Viewer: chỉ xem.
        </p>
      </section>

      <section className="rounded-lg border border-[#ece4f3] bg-white overflow-hidden">
        <div className="border-b border-[#ece4f3] px-4 py-3">
          <h2 className="text-[16px] font-bold">Danh sách user</h2>
        </div>
        {loading ? (
          <p className="p-4 text-[13px] text-[#666]">Đang tải…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="bg-[#f8f6fb] text-[12px] uppercase text-[#666]">
                <tr>
                  <th className="px-4 py-2 font-semibold">Email</th>
                  <th className="px-4 py-2 font-semibold">Role</th>
                  <th className="px-4 py-2 font-semibold">Trạng thái</th>
                  <th className="px-4 py-2 font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = user.id === currentUserId;
                  return (
                    <tr
                      key={user.id}
                      className="border-t border-[#f0ebf5]"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{user.email || "—"}</p>
                        {isSelf ? (
                          <p className="text-[11px] text-brand">Bạn</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={user.role ?? ""}
                          disabled={busyId === user.id || isSelf}
                          onChange={(e) => {
                            const next = e.target.value as CmsRole;
                            if (CMS_ROLES.includes(next)) {
                              void changeRole(user, next);
                            }
                          }}
                          className="rounded border border-[#d9d9d9] px-2 py-1.5 text-[13px] outline-none focus:border-brand disabled:opacity-60"
                        >
                          {!user.role ? (
                            <option value="">— chưa gán —</option>
                          ) : null}
                          {CMS_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded px-2 py-0.5 text-[11px] font-bold",
                            user.banned
                              ? "bg-red-50 text-red-700"
                              : "bg-emerald-50 text-emerald-700",
                          )}
                        >
                          {user.banned ? "Đã khóa" : "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busyId === user.id}
                            onClick={() => {
                              setError(null);
                              setSuccess(null);
                              setResetTarget(user);
                            }}
                            className="text-[#666] hover:text-brand disabled:opacity-40"
                          >
                            Cấp MK
                          </button>
                          <button
                            type="button"
                            disabled={busyId === user.id || isSelf}
                            onClick={() => void toggleBan(user)}
                            className="text-[#666] hover:text-brand disabled:opacity-40"
                          >
                            {user.banned ? "Mở khóa" : "Khóa"}
                          </button>
                          <button
                            type="button"
                            disabled={busyId === user.id || isSelf}
                            onClick={() => void removeUser(user)}
                            className="text-red-600 hover:underline disabled:opacity-40"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!users.length ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-[#888]"
                    >
                      Chưa có user
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
