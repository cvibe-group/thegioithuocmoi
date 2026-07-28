"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AdminHomepageLink,
  AdminHomepageSection,
  ArticleOption,
} from "@/lib/admin/structure-queries";
import { useConfirmDialog } from "@/components/admin/ConfirmDialog";
import { createAuthBrowserClient } from "@/lib/supabase/browser";

export function HomepageEditor({
  featuredPath: initialFeatured,
  secondaryPaths: initialSecondary,
  sections: initialSections,
  links: initialLinks,
  articles,
}: {
  featuredPath: string;
  secondaryPaths: string[];
  sections: AdminHomepageSection[];
  links: AdminHomepageLink[];
  articles: ArticleOption[];
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();
  const [featuredPath, setFeaturedPath] = useState(initialFeatured);
  const [secondaryPaths, setSecondaryPaths] = useState(initialSecondary);
  const [sections, setSections] = useState(initialSections);
  const [links, setLinks] = useState(initialLinks);
  const [activeSection, setActiveSection] = useState(initialSections[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const articleLabel = useMemo(() => {
    const map = new Map(articles.map((item) => [item.path, item]));
    return (path: string) => {
      const item = map.get(path);
      return item ? `${item.title} (${item.category_label})` : path;
    };
  }, [articles]);

  const sectionLinks = links
    .filter((link) => link.section_id === activeSection)
    .sort((a, b) => a.sort_order - b.sort_order);

  async function saveAll() {
    setSaving(true);
    setError(null);
    const supabase = createAuthBrowserClient();

    const upsertSettings = [
      { key: "featured_article_path", value: featuredPath },
      { key: "secondary_news_paths", value: secondaryPaths.filter(Boolean) },
    ];
    for (const row of upsertSettings) {
      const { error: settingError } = await supabase.from("site_settings").upsert({
        key: row.key,
        value: row.value,
        updated_at: new Date().toISOString(),
      });
      if (settingError) {
        setSaving(false);
        setError(settingError.message);
        return;
      }
    }

    for (const [index, section] of sections.entries()) {
      const { error: sectionError } = await supabase
        .from("homepage_sections")
        .update({
          title: section.title,
          see_more_href: section.see_more_href,
          sort_order: index,
        })
        .eq("id", section.id);
      if (sectionError) {
        setSaving(false);
        setError(sectionError.message);
        return;
      }
    }

    // Rebuild section links from local state
    const { error: clearError } = await supabase
      .from("homepage_section_articles")
      .delete()
      .neq("article_path", "__never__");
    if (clearError) {
      setSaving(false);
      setError(clearError.message);
      return;
    }

    const normalized = sections.flatMap((section) =>
      links
        .filter((link) => link.section_id === section.id)
        .map((link, sort_order) => ({
          section_id: section.id,
          article_path: link.article_path,
          sort_order,
        })),
    );

    if (normalized.length) {
      const { error: insertError } = await supabase
        .from("homepage_section_articles")
        .insert(normalized);
      if (insertError) {
        setSaving(false);
        setError(insertError.message);
        return;
      }
    }

    setSaving(false);
    router.refresh();
  }

  function addSecondary() {
    const first = articles.find((item) => !secondaryPaths.includes(item.path));
    if (!first) return;
    setSecondaryPaths((prev) => [...prev, first.path]);
  }

  function addSectionLink() {
    if (!activeSection) return;
    const used = new Set(
      links.filter((link) => link.section_id === activeSection).map((link) => link.article_path),
    );
    const first = articles.find((item) => !used.has(item.path));
    if (!first) return;
    setLinks((prev) => [
      ...prev,
      {
        section_id: activeSection,
        article_path: first.path,
        sort_order: sectionLinks.length,
      },
    ]);
  }

  async function addSection() {
    const id = `section-${Date.now()}`;
    const supabase = createAuthBrowserClient();
    const { data, error: insertError } = await supabase
      .from("homepage_sections")
      .insert({
        id,
        title: "Section mới",
        see_more_href: "/",
        sort_order: sections.length,
      })
      .select("*")
      .single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSections((prev) => [...prev, data as AdminHomepageSection]);
    setActiveSection(data.id);
    router.refresh();
  }

  async function removeSection(id: string) {
    const ok = await confirm({
      title: "Xóa section trang chủ?",
      description: "Section này và các link bên trong sẽ bị xóa vĩnh viễn.",
      confirmLabel: "Xóa section",
      tone: "danger",
    });
    if (!ok) return;
    const supabase = createAuthBrowserClient();
    const { error: deleteError } = await supabase
      .from("homepage_sections")
      .delete()
      .eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setSections((prev) => prev.filter((section) => section.id !== id));
    setLinks((prev) => prev.filter((link) => link.section_id !== id));
    if (activeSection === id) setActiveSection("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {dialog}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={saveAll}
          disabled={saving}
          className="rounded bg-brand px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
        >
          {saving ? "Đang lưu..." : "Lưu homepage"}
        </button>
        <button
          type="button"
          onClick={addSection}
          className="rounded border border-border-light px-3 py-2 text-[13px]"
        >
          + Section
        </button>
      </div>
      {error ? (
        <p className="rounded bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>
      ) : null}

      <section className="space-y-3 rounded-lg border border-border-light bg-white p-4">
        <h2 className="text-[15px] font-bold">Featured + Secondary</h2>
        <label className="block text-[13px]">
          Featured article
          <select
            value={featuredPath}
            onChange={(event) => setFeaturedPath(event.target.value)}
            className="mt-1 w-full rounded border border-[#d9d9d9] px-3 py-2"
          >
            <option value="">— Chọn bài —</option>
            {articles.map((article) => (
              <option key={article.path} value={article.path}>
                {articleLabel(article.path)}
              </option>
            ))}
          </select>
        </label>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-medium">Secondary news</p>
            <button
              type="button"
              onClick={addSecondary}
              className="rounded border border-border-light px-2 py-1 text-[12px]"
            >
              + Bài
            </button>
          </div>
          <div className="space-y-2">
            {secondaryPaths.map((path, index) => (
              <div key={`${path}-${index}`} className="flex gap-2">
                <select
                  value={path}
                  onChange={(event) =>
                    setSecondaryPaths((prev) =>
                      prev.map((row, i) => (i === index ? event.target.value : row)),
                    )
                  }
                  className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[13px]"
                >
                  {articles.map((article) => (
                    <option key={article.path} value={article.path}>
                      {articleLabel(article.path)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    setSecondaryPaths((prev) => prev.filter((_, i) => i !== index))
                  }
                  className="text-[12px] text-red-600"
                >
                  Xóa
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="space-y-2 rounded-lg border border-border-light bg-white p-3">
          {sections.map((section) => (
            <div
              key={section.id}
              className={`rounded border p-2 ${
                activeSection === section.id
                  ? "border-brand bg-brand-light"
                  : "border-border-light"
              }`}
            >
              <button
                type="button"
                className="mb-2 w-full text-left text-[13px] font-semibold"
                onClick={() => setActiveSection(section.id)}
              >
                {section.title}
              </button>
              <button
                type="button"
                className="text-[12px] text-red-600"
                onClick={() => removeSection(section.id)}
              >
                Xóa
              </button>
            </div>
          ))}
        </div>

        {activeSection ? (
          <div className="space-y-4 rounded-lg border border-border-light bg-white p-4">
            {sections
              .filter((section) => section.id === activeSection)
              .map((section) => (
                <div key={section.id} className="space-y-3">
                  <label className="block text-[13px]">
                    Title
                    <input
                      value={section.title}
                      onChange={(event) =>
                        setSections((prev) =>
                          prev.map((row) =>
                            row.id === section.id
                              ? { ...row, title: event.target.value }
                              : row,
                          ),
                        )
                      }
                      className="mt-1 w-full rounded border border-[#d9d9d9] px-3 py-2"
                    />
                  </label>
                  <label className="block text-[13px]">
                    See more href
                    <input
                      value={section.see_more_href}
                      onChange={(event) =>
                        setSections((prev) =>
                          prev.map((row) =>
                            row.id === section.id
                              ? { ...row, see_more_href: event.target.value }
                              : row,
                          ),
                        )
                      }
                      className="mt-1 w-full rounded border border-[#d9d9d9] px-3 py-2"
                    />
                  </label>
                </div>
              ))}

            <div className="border-t border-border-light pt-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[14px] font-bold">Articles in section</h3>
                <button
                  type="button"
                  onClick={addSectionLink}
                  className="rounded border border-border-light px-2 py-1 text-[12px]"
                >
                  + Bài
                </button>
              </div>
              <div className="space-y-2">
                {sectionLinks.map((link, index) => (
                  <div key={`${link.section_id}-${link.article_path}-${index}`} className="flex gap-2">
                    <select
                      value={link.article_path}
                      onChange={(event) =>
                        setLinks((prev) =>
                          prev.map((row) =>
                            row.section_id === link.section_id &&
                            row.article_path === link.article_path &&
                            row.sort_order === link.sort_order
                              ? { ...row, article_path: event.target.value }
                              : row,
                          ),
                        )
                      }
                      className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[13px]"
                    >
                      {articles.map((article) => (
                        <option key={article.path} value={article.path}>
                          {articleLabel(article.path)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        setLinks((prev) =>
                          prev.filter(
                            (row) =>
                              !(
                                row.section_id === link.section_id &&
                                row.article_path === link.article_path &&
                                row.sort_order === link.sort_order
                              ),
                          ),
                        )
                      }
                      className="text-[12px] text-red-600"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
