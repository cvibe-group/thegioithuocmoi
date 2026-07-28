"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, MouseEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Folder, ChevronRight, FolderPlus, Trash2 } from "lucide-react";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { useConfirmDialog } from "@/components/admin/ConfirmDialog";
import { createAuthBrowserClient } from "@/lib/supabase/browser";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ADMIN_DEFAULT_PAGE_SIZE,
  paginationRange,
  type AdminPageSize,
  type AdminTableColumn,
} from "@/lib/admin/pagination";

const FOLDER_PLACEHOLDER = ".emptyFolderPlaceholder";
const PROTECTED_FOLDERS = new Set(["wp-uploads"]);

type MediaFile = {
  name: string;
  url: string;
  updatedAt?: string | null;
};

function sanitizeFolderName(raw: string) {
  return raw
    .trim()
    .replace(/[\\/]+/g, "-")
    .replace(/\.\./g, "")
    .replace(/[^\w\u00C0-\u024F\u1E00-\u1EFF .-]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
}

async function listObjectPathsRecursive(
  supabase: SupabaseClient,
  bucket: string,
  folderPath: string,
): Promise<string[]> {
  const { data, error } = await supabase.storage.from(bucket).list(folderPath, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) throw new Error(error.message);

  const paths: string[] = [];
  for (const item of data ?? []) {
    if (!item.name) continue;
    const fullPath = `${folderPath}/${item.name}`;
    const isFile = typeof item.metadata?.size === "number";
    if (isFile) {
      paths.push(fullPath);
    } else {
      const nested = await listObjectPathsRecursive(supabase, bucket, fullPath);
      paths.push(...nested);
    }
  }
  return paths;
}

async function removePaths(
  supabase: SupabaseClient,
  bucket: string,
  paths: string[],
) {
  const chunkSize = 100;
  for (let i = 0; i < paths.length; i += chunkSize) {
    const chunk = paths.slice(i, i + chunkSize);
    const { error } = await supabase.storage.from(bucket).remove(chunk);
    if (error) throw new Error(error.message);
  }
}

export function MediaManager({
  bucket,
  root,
  currentPath,
  initialFolders,
  initialFiles,
}: {
  bucket: string;
  root: string;
  currentPath: string;
  initialFolders: string[];
  initialFiles: MediaFile[];
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();
  const [files, setFiles] = useState(initialFiles);
  const [folders, setFolders] = useState(initialFolders);
  const [uploading, setUploading] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [folderName, setFolderName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AdminPageSize>(ADMIN_DEFAULT_PAGE_SIZE);

  useEffect(() => {
    setFiles(initialFiles);
    setFolders(initialFolders);
    setPage(1);
  }, [initialFiles, initialFolders, currentPath]);

  const crumbs = useMemo(() => {
    const parts = currentPath.split("/").filter(Boolean);
    return parts.map((part, index) => ({
      label: part,
      path: parts.slice(0, index + 1).join("/"),
    }));
  }, [currentPath]);

  const filePage = useMemo(() => {
    const range = paginationRange(page, pageSize, files.length);
    return {
      ...range,
      rows: files.slice(range.startIndex, range.endIndex),
    };
  }, [files, page, pageSize]);

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const supabase = createAuthBrowserClient();
      const objectPath = `${currentPath}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(objectPath, file, { upsert: true, contentType: file.type });
      if (uploadError) throw new Error(uploadError.message);

      const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
      setFiles((prev) => {
        const next = prev.filter((item) => item.name !== file.name);
        return [{ name: file.name, url: data.publicUrl }, ...next];
      });
      form.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload thất bại");
    } finally {
      setUploading(false);
    }
  }

  async function onCreateFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = sanitizeFolderName(folderName);
    if (!name) {
      setError("Tên folder không hợp lệ");
      return;
    }
    if (folders.includes(name) || files.some((f) => f.name === name)) {
      setError("Folder hoặc file cùng tên đã tồn tại");
      return;
    }

    setCreatingFolder(true);
    setError(null);
    try {
      const supabase = createAuthBrowserClient();
      const objectPath = `${currentPath}/${name}/${FOLDER_PLACEHOLDER}`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(objectPath, new Blob([""], { type: "text/plain" }), {
          upsert: false,
          contentType: "text/plain",
        });
      if (uploadError) throw new Error(uploadError.message);

      setFolders((prev) => [...prev, name].sort((a, b) => a.localeCompare(b)));
      setFolderName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo folder thất bại");
    } finally {
      setCreatingFolder(false);
    }
  }

  async function onDeleteFile(fileName: string) {
    const ok = await confirm({
      title: "Xóa ảnh?",
      description: `Ảnh “${fileName}” sẽ bị xóa khỏi Storage và không thể hoàn tác.`,
      confirmLabel: "Xóa ảnh",
      tone: "danger",
    });
    if (!ok) return;

    setDeleting(`file:${fileName}`);
    setError(null);
    try {
      const supabase = createAuthBrowserClient();
      const objectPath = `${currentPath}/${fileName}`;
      const { error: removeError } = await supabase.storage
        .from(bucket)
        .remove([objectPath]);
      if (removeError) throw new Error(removeError.message);

      setFiles((prev) => prev.filter((item) => item.name !== fileName));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xóa ảnh thất bại");
    } finally {
      setDeleting(null);
    }
  }

  async function onDeleteFolder(folder: string, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (PROTECTED_FOLDERS.has(folder)) {
      setError(`Không thể xóa folder bảo vệ "${folder}"`);
      return;
    }

    const folderPath = `${currentPath}/${folder}`;
    const ok = await confirm({
      title: "Xóa folder?",
      description: `Folder “${folder}” và toàn bộ nội dung bên trong (${folderPath}) sẽ bị xóa vĩnh viễn.`,
      confirmLabel: "Xóa folder",
      tone: "danger",
    });
    if (!ok) return;

    setDeleting(`folder:${folder}`);
    setError(null);
    try {
      const supabase = createAuthBrowserClient();
      const paths = await listObjectPathsRecursive(supabase, bucket, folderPath);
      if (paths.length === 0) {
        // Empty listing quirk — still try placeholder
        paths.push(`${folderPath}/${FOLDER_PLACEHOLDER}`);
      }
      await removePaths(supabase, bucket, paths);
      setFolders((prev) => prev.filter((name) => name !== folder));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xóa folder thất bại");
    } finally {
      setDeleting(null);
    }
  }

  const busy = uploading || creatingFolder || Boolean(deleting);

  return (
    <div className="space-y-6">
      {dialog}
      <nav className="flex flex-wrap items-center gap-1 text-[13px]">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <span key={crumb.path} className="flex items-center gap-1">
              {index > 0 ? <ChevronRight className="size-3.5 text-[#999]" /> : null}
              {isLast ? (
                <span className="font-bold text-brand">{crumb.label}</span>
              ) : (
                <Link
                  href={`/admin/media?path=${encodeURIComponent(crumb.path)}`}
                  className="text-[#666] hover:text-brand"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      <div className="grid gap-3 lg:grid-cols-2">
        <form
          onSubmit={onUpload}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-border-light bg-white p-4"
        >
          <label className="block min-w-[200px] flex-1">
            <span className="mb-1 block text-[13px] font-medium">
              Upload vào <code>{currentPath}</code>
            </span>
            <input type="file" name="file" accept="image/*" required className="text-[13px]" />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-brand px-4 py-2 text-[14px] font-bold text-white disabled:opacity-60"
          >
            {uploading ? "Đang upload..." : "Upload"}
          </button>
          {currentPath !== root ? (
            <Link
              href={`/admin/media?path=${encodeURIComponent(root)}`}
              className="rounded border border-border-light px-3 py-2 text-[13px]"
            >
              Về root
            </Link>
          ) : null}
        </form>

        <form
          onSubmit={onCreateFolder}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-border-light bg-white p-4"
        >
          <label className="block min-w-[200px] flex-1">
            <span className="mb-1 block text-[13px] font-medium">Tạo folder mới</span>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="vd: banners, 2026, thuoc"
              required
              className="w-full rounded border border-border-light px-3 py-2 text-[13px]"
            />
          </label>
          <button
            type="submit"
            disabled={busy || !folderName.trim()}
            className="inline-flex items-center gap-1.5 rounded border border-brand bg-brand-light px-4 py-2 text-[14px] font-bold text-brand disabled:opacity-60"
          >
            <FolderPlus className="size-4" />
            {creatingFolder ? "Đang tạo..." : "Tạo folder"}
          </button>
        </form>
      </div>

      {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
      {deleting ? (
        <p className="text-[13px] text-[#666]">Đang xóa… vui lòng đợi.</p>
      ) : null}

      {folders.length > 0 ? (
        <div>
          <h2 className="mb-3 text-[15px] font-bold">Folders</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {folders.map((folder) => {
              const nextPath = `${currentPath}/${folder}`;
              const isWp = folder === "wp-uploads";
              const isProtected = PROTECTED_FOLDERS.has(folder);
              const isDeleting = deleting === `folder:${folder}`;
              return (
                <div
                  key={folder}
                  className="flex items-center gap-2 rounded-lg border border-border-light bg-white px-3 py-2 transition-colors hover:border-brand hover:bg-brand-light"
                >
                  <Link
                    href={`/admin/media?path=${encodeURIComponent(nextPath)}`}
                    className="flex min-w-0 flex-1 items-center gap-3 py-1"
                  >
                    <Folder className={`size-5 shrink-0 ${isWp ? "text-brand" : "text-[#888]"}`} />
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold">{folder}</p>
                      {isWp ? (
                        <p className="text-[11px] text-[#888]">Ảnh migrate từ WordPress</p>
                      ) : null}
                    </div>
                  </Link>
                  {!isProtected ? (
                    <button
                      type="button"
                      title="Xóa folder"
                      disabled={busy}
                      onClick={(e) => onDeleteFolder(folder, e)}
                      className="shrink-0 rounded p-2 text-[#999] hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 className={`size-4 ${isDeleting ? "animate-pulse" : ""}`} />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-[15px] font-bold">
          Files {files.length ? `(${files.length})` : ""}
        </h2>
        <AdminDataTable
          columns={
            [
              {
                key: "preview",
                header: "Preview",
                className: "w-[88px]",
                cell: (file) => (
                  <div className="relative h-14 w-14 overflow-hidden rounded bg-brand-light">
                    <Image
                      src={file.url}
                      alt={file.name}
                      fill
                      className="object-contain p-1"
                      sizes="56px"
                      unoptimized
                    />
                  </div>
                ),
              },
              {
                key: "name",
                header: "Tên file",
                cell: (file) => (
                  <p className="truncate font-medium">{file.name}</p>
                ),
              },
              {
                key: "actions",
                header: "Thao tác",
                cell: (file) => {
                  const isDeleting = deleting === `file:${file.name}`;
                  return (
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand hover:underline"
                      >
                        Mở URL
                      </a>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onDeleteFile(file.name)}
                        className="inline-flex items-center gap-1 text-red-600 hover:underline disabled:opacity-50"
                      >
                        <Trash2
                          className={`size-3.5 ${isDeleting ? "animate-pulse" : ""}`}
                        />
                        {isDeleting ? "Đang xóa…" : "Xóa"}
                      </button>
                    </div>
                  );
                },
              },
            ] satisfies AdminTableColumn<MediaFile>[]
          }
          rows={filePage.rows}
          rowKey={(row) => row.name}
          emptyMessage="Folder trống — chọn folder khác hoặc upload ảnh."
        />
        <AdminPagination
          page={filePage.page ?? page}
          pageSize={pageSize}
          total={files.length}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
}
