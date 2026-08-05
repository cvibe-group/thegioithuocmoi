import { NextResponse } from "next/server";
import {
  CMS_ROLES,
  hasPermission,
  isCmsRole,
  normalizeRole,
  type CmsRole,
} from "@/lib/admin/auth";
import { createAuthServerClient } from "@/lib/supabase/server";
import {
  createServiceRoleClient,
  hasServiceRoleKey,
} from "@/lib/supabase/admin";

async function requireUsersAdmin() {
  const auth = await createAuthServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user || !hasPermission(user, "users")) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  if (!hasServiceRoleKey()) {
    return {
      error: NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY chưa được cấu hình" },
        { status: 500 },
      ),
    };
  }
  return { user, admin: createServiceRoleClient() };
}

function mapUser(u: {
  id: string;
  email?: string;
  created_at?: string;
  last_sign_in_at?: string;
  banned_until?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}) {
  const raw =
    typeof u.app_metadata?.role === "string" ? u.app_metadata.role : null;
  const role = normalizeRole(raw);
  return {
    id: u.id,
    email: u.email ?? "",
    role,
    roleRaw: raw,
    createdAt: u.created_at ?? null,
    lastSignInAt: u.last_sign_in_at ?? null,
    banned:
      Boolean(u.banned_until) &&
      u.banned_until !== "none" &&
      new Date(u.banned_until!).getTime() > Date.now(),
  };
}

export async function GET() {
  const gate = await requireUsersAdmin();
  if ("error" in gate && gate.error) return gate.error;

  const { admin } = gate as {
    user: { id: string };
    admin: ReturnType<typeof createServiceRoleClient>;
  };

  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users = (data.users ?? [])
    .map(mapUser)
    .filter((u) => u.role != null || u.roleRaw != null)
    .sort((a, b) => a.email.localeCompare(b.email));

  // Also include users without CMS role so super_admin can assign one
  const all = (data.users ?? [])
    .map(mapUser)
    .sort((a, b) => a.email.localeCompare(b.email));

  return NextResponse.json({ users: all.length ? all : users, roles: CMS_ROLES });
}

export async function POST(request: Request) {
  const gate = await requireUsersAdmin();
  if ("error" in gate && gate.error) return gate.error;
  const { admin } = gate as {
    user: { id: string };
    admin: ReturnType<typeof createServiceRoleClient>;
  };

  let body: { email?: string; password?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const role = body.role;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email và mật khẩu là bắt buộc" },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Mật khẩu tối thiểu 8 ký tự" },
      { status: 400 },
    );
  }
  if (!isCmsRole(role ?? "")) {
    return NextResponse.json({ error: "Role không hợp lệ" }, { status: 400 });
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ user: mapUser(data.user) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const gate = await requireUsersAdmin();
  if ("error" in gate && gate.error) return gate.error;
  const { user: actor, admin } = gate as {
    user: { id: string; app_metadata: Record<string, unknown> };
    admin: ReturnType<typeof createServiceRoleClient>;
  };

  let body: {
    id?: string;
    role?: string;
    banned?: boolean;
    password?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = body.id?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ error: "Thiếu id user" }, { status: 400 });
  }

  if (typeof body.password === "string") {
    const password = body.password;
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Mật khẩu mới tối thiểu 8 ký tự" },
        { status: 400 },
      );
    }
    const { data, error } = await admin.auth.admin.updateUserById(id, {
      password,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ user: mapUser(data.user), passwordReset: true });
  }

  if (body.role !== undefined) {
    if (!isCmsRole(body.role)) {
      return NextResponse.json({ error: "Role không hợp lệ" }, { status: 400 });
    }
    if (id === actor.id && body.role !== "super_admin") {
      return NextResponse.json(
        { error: "Không thể hạ role của chính mình" },
        { status: 400 },
      );
    }

    // Prevent removing the last super_admin
    if (body.role !== "super_admin") {
      const { data: listed } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      const supers = (listed?.users ?? []).filter((u) => {
        const r = normalizeRole(
          typeof u.app_metadata?.role === "string" ? u.app_metadata.role : null,
        );
        return r === "super_admin" && u.id !== id;
      });
      const target = (listed?.users ?? []).find((u) => u.id === id);
      const targetWasSuper =
        normalizeRole(
          typeof target?.app_metadata?.role === "string"
            ? target.app_metadata.role
            : null,
        ) === "super_admin";
      if (targetWasSuper && supers.length === 0) {
        return NextResponse.json(
          { error: "Phải giữ ít nhất một Super Admin" },
          { status: 400 },
        );
      }
    }

    const { data, error } = await admin.auth.admin.updateUserById(id, {
      app_metadata: { role: body.role as CmsRole },
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ user: mapUser(data.user) });
  }

  if (typeof body.banned === "boolean") {
    if (id === actor.id) {
      return NextResponse.json(
        { error: "Không thể khóa chính mình" },
        { status: 400 },
      );
    }
    const { data, error } = await admin.auth.admin.updateUserById(id, {
      ban_duration: body.banned ? "876000h" : "none",
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ user: mapUser(data.user) });
  }

  return NextResponse.json({ error: "Không có thay đổi" }, { status: 400 });
}

export async function DELETE(request: Request) {
  const gate = await requireUsersAdmin();
  if ("error" in gate && gate.error) return gate.error;
  const { user: actor, admin } = gate as {
    user: { id: string };
    admin: ReturnType<typeof createServiceRoleClient>;
  };

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ error: "Thiếu id" }, { status: 400 });
  }
  if (id === actor.id) {
    return NextResponse.json(
      { error: "Không thể xóa chính mình" },
      { status: 400 },
    );
  }

  const { data: listed } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  const target = (listed?.users ?? []).find((u) => u.id === id);
  const targetRole = normalizeRole(
    typeof target?.app_metadata?.role === "string"
      ? target.app_metadata.role
      : null,
  );
  if (targetRole === "super_admin") {
    const otherSupers = (listed?.users ?? []).filter((u) => {
      const r = normalizeRole(
        typeof u.app_metadata?.role === "string" ? u.app_metadata.role : null,
      );
      return r === "super_admin" && u.id !== id;
    });
    if (otherSupers.length === 0) {
      return NextResponse.json(
        { error: "Không thể xóa Super Admin cuối cùng" },
        { status: 400 },
      );
    }
  }

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
