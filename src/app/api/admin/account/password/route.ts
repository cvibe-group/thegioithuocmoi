import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isCmsUser } from "@/lib/admin/auth";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { createAuthServerClient } from "@/lib/supabase/server";

/** Đổi mật khẩu: xác minh mật khẩu cũ rồi cập nhật mật khẩu mới. */
export async function POST(request: Request) {
  const auth = await createAuthServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user || !isCmsUser(user) || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword ?? "";

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Cần mật khẩu hiện tại và mật khẩu mới" },
      { status: 400 },
    );
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "Mật khẩu mới tối thiểu 8 ký tự" },
      { status: 400 },
    );
  }
  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "Mật khẩu mới phải khác mật khẩu hiện tại" },
      { status: 400 },
    );
  }

  const url = getSupabaseUrl();
  const anon = getSupabaseAnonKey();
  if (!url || !anon) {
    return NextResponse.json(
      { error: "Supabase chưa được cấu hình" },
      { status: 500 },
    );
  }

  // Verify current password without touching the browser session cookies.
  const verifier = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: verifyError } = await verifier.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyError) {
    return NextResponse.json(
      { error: "Mật khẩu hiện tại không đúng" },
      { status: 400 },
    );
  }

  const { error: updateError } = await auth.auth.updateUser({
    password: newPassword,
  });
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
