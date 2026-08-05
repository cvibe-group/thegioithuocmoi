import { MediaManager } from "@/components/admin/MediaManager";
import { requirePermission } from "@/lib/admin/require-permission";
import { createAuthServerClient } from "@/lib/supabase/server";

const BUCKET = "images";
const ROOT = "thegioithuocmoi";
const FOLDER_PLACEHOLDER = ".emptyFolderPlaceholder";

function normalizePath(raw: string | undefined) {
  const value = (raw ?? ROOT).replace(/^\/+|\/+$/g, "");
  if (!value || value.includes("..") || !value.startsWith(ROOT)) return ROOT;
  return value;
}

interface PageProps {
  searchParams: Promise<{ path?: string }>;
}

export default async function AdminMediaPage({ searchParams }: PageProps) {
  await requirePermission("media");
  const params = await searchParams;
  const folderPath = normalizePath(params.path);
  const supabase = await createAuthServerClient();

  const { data, error } = await supabase.storage.from(BUCKET).list(folderPath, {
    limit: 500,
    sortBy: { column: "name", order: "asc" },
  });

  if (error) {
    return (
      <div>
        <h1 className="mb-2 text-[24px] font-bold">Media</h1>
        <p className="rounded bg-red-50 px-3 py-2 text-[13px] text-red-700">
          Không đọc được folder: {error.message}
        </p>
      </div>
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(`${folderPath}/placeholder`);
  const baseUrl = publicUrl.replace(/\/placeholder$/, "");

  const folderSet = new Set<string>();
  const files: { name: string; url: string; updatedAt?: string | null }[] = [];

  for (const item of data ?? []) {
    if (!item.name || item.name === FOLDER_PLACEHOLDER) continue;
    // Supabase folders: id === null and no file size in metadata
    const isFile = typeof item.metadata?.size === "number";
    if (isFile) {
      files.push({
        name: item.name,
        url: `${baseUrl}/${item.name}`,
        updatedAt: item.updated_at,
      });
    } else {
      folderSet.add(item.name);
    }
  }

  const folderNames = [...folderSet].sort((a, b) => a.localeCompare(b));

  // Ensure wp-uploads appears at root even if listing quirks hide the prefix
  if (folderPath === ROOT && !folderNames.includes("wp-uploads")) {
    const { data: wpCheck } = await supabase.storage
      .from(BUCKET)
      .list(`${ROOT}/wp-uploads`, { limit: 1 });
    if (wpCheck !== null) folderNames.unshift("wp-uploads");
  }

  return (
    <div>
      <h1 className="mb-2 text-[24px] font-bold">Media</h1>
      <p className="mb-6 text-[14px] text-[#666]">
        Bucket <code>images</code> — mở folder <strong>wp-uploads</strong> để xem ảnh migrate từ WordPress.
      </p>
      <MediaManager
        key={folderPath}
        bucket={BUCKET}
        root={ROOT}
        currentPath={folderPath}
        initialFolders={folderNames}
        initialFiles={files}
      />
    </div>
  );
}
