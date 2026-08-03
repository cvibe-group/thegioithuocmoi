import Link from "next/link";
import { createAuthServerClient } from "@/lib/supabase/server";
import { createDataClient } from "@/lib/supabase/data";

async function getCounts() {
  const data = createDataClient();
  const auth = await createAuthServerClient();
  const [articles, categories, glossaryCats, media] = await Promise.all([
    data.from("articles").select("*", { count: "exact", head: true }),
    data.from("categories").select("*", { count: "exact", head: true }),
    data
      .from("categories")
      .select("slug")
      .eq("kind", "glossary"),
    auth.storage.from("images").list("thegioithuocmoi", { limit: 1000 }),
  ]);

  const glossarySlugs = (glossaryCats.data ?? []).map((row) => row.slug as string);
  let glossaryCount = 0;
  if (glossarySlugs.length) {
    const { count } = await data
      .from("category_articles")
      .select("*", { count: "exact", head: true })
      .in("category_slug", glossarySlugs);
    glossaryCount = count ?? 0;
  }

  return {
    articles: articles.count ?? 0,
    categories: categories.count ?? 0,
    glossary: glossaryCount,
    media: media.data?.length ?? 0,
  };
}

export default async function AdminDashboardPage() {
  const counts = await getCounts();

  const cards = [
    { label: "Bài viết", value: counts.articles, href: "/admin/articles" },
    { label: "Danh mục", value: counts.categories, href: "/admin/categories" },
    { label: "Glossary", value: counts.glossary, href: "/admin/glossary" },
    { label: "Media", value: counts.media, href: "/admin/media" },
  ];

  return (
    <div>
      <h1 className="mb-2 text-[24px] font-bold">Dashboard</h1>
      <p className="mb-6 text-[14px] text-[#666]">
        Tổng quan nội dung đã publish / CMS. Quản lý bài viết, danh mục, media và branding bên dưới.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-lg border border-[#ece4f3] bg-white p-4 transition-shadow hover:shadow-sm"
          >
            <p className="text-[13px] text-[#666]">{card.label}</p>
            <p className="mt-2 text-[28px] font-bold text-brand">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-border-light bg-white p-5">
        <h2 className="mb-2 text-[16px] font-bold">Bắt đầu nhanh</h2>
        <ul className="list-disc space-y-1 pl-5 text-[14px] text-[#444]">
          <li>
            <Link href="/admin/articles" className="text-brand hover:underline">
              Bài viết
            </Link>{" "}
            — CRUD nội dung
          </li>
          <li>
            <Link href="/admin/homepage" className="text-brand hover:underline">
              Homepage
            </Link>{" "}
            — featured / sections
          </li>
          <li>
            <Link href="/admin/menu" className="text-brand hover:underline">
              Menu
            </Link>
            {" / "}
            <Link href="/admin/sidebar" className="text-brand hover:underline">
              Sidebar
            </Link>
            {" / "}
            <Link href="/admin/glossary" className="text-brand hover:underline">
              Glossary
            </Link>
          </li>
          <li>
            <Link href="/admin/settings" className="text-brand hover:underline">
              Cài đặt branding
            </Link>{" "}
            — logo, màu chủ đạo
          </li>
        </ul>
      </div>
    </div>
  );
}
