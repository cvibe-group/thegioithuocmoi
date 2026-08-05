import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { canWriteCms } from "@/lib/admin/auth";
import { createAuthServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!canWriteCms(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    paths?: string[];
  } | null;

  const paths = Array.isArray(body?.paths) ? body.paths : [];
  for (const path of paths) {
    if (typeof path === "string" && path.startsWith("/")) {
      revalidatePath(path);
    }
  }
  revalidatePath("/");
  revalidatePath("/tim-kiem");

  return NextResponse.json({ ok: true, revalidated: paths.length + 2 });
}
