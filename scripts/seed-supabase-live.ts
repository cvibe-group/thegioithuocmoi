/**
 * Seed Supabase from local src/data modules.
 * Requires NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
 * (temporary insert/delete RLS policies must exist for seeding).
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import {
  DEFAULT_AUTHOR,
  DEFAULT_AUTHOR_BIO,
  getAllArticleParams,
  getArticleDetail,
  toLocalArticleHref,
} from "./seed-data/articles";
import {
  getGeneTherapyPage,
  getGeneTherapySubcategoryPage,
  getOtherNewsPage,
  getSideEffectsPage,
  getThuocPage,
  getThuocSubcategoryPage,
  getVaccinesPage,
} from "./seed-data/category-pages";
import { getGlossaryPage, glossaryTabs } from "./seed-data/glossary-pages";
import {
  articleSections,
  featuredArticle,
  secondaryNews,
} from "./seed-data/homepage";
import {
  geneTherapySubcategorySlugs,
  navItems,
  thuocSubcategorySlugs,
} from "./seed-data/navigation";
import { sidebarPanels } from "./seed-data/sidebar";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

const supabase = createClient(url, key);

async function clearAll() {
  const tables = [
    "category_articles",
    "homepage_section_articles",
    "homepage_sections",
    "nav_dropdown_items",
    "nav_items",
    "sidebar_panel_items",
    "sidebar_panels",
    "glossary_entries",
    "glossary_tabs",
    "articles",
    "categories",
    "site_settings",
  ] as const;

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    // site_settings / homepage_sections use text keys; fallback wipe
    if (error) {
      const { error: error2 } = await supabase.from(table).delete().gte("sort_order", -999999);
      if (error2 && table === "site_settings") {
        await supabase.from("site_settings").delete().neq("key", "");
      } else if (error2 && table === "homepage_sections") {
        await supabase.from("homepage_sections").delete().neq("id", "");
      } else if (error2 && table === "glossary_tabs") {
        await supabase.from("glossary_tabs").delete().neq("id", "");
      } else if (error2) {
        console.warn(`clear ${table}:`, error2.message);
      }
    }
  }
}

type ArticleRow = {
  path: string;
  slug: string;
  year: string;
  month: string;
  day: string;
  title: string;
  category_label: string;
  category_href: string;
  date_label: string;
  datetime_label: string;
  read_time: string;
  image: string | null;
  excerpt: string | null;
  author: string;
  author_bio: string;
  layout: string | null;
  blocks: unknown;
  is_published: boolean;
};

async function main() {
  console.log("Clearing tables...");
  await clearAll();

  const articleMap = new Map<string, ArticleRow>();

  for (const params of getAllArticleParams()) {
    const detail = getArticleDetail(params.year, params.month, params.day, params.slug);
    if (!detail) continue;
    const path = `/${detail.year}/${detail.month}/${detail.day}/${detail.slug}`;
    articleMap.set(path, {
      path,
      slug: detail.slug,
      year: detail.year,
      month: detail.month,
      day: detail.day,
      title: detail.title,
      category_label: detail.category,
      category_href: detail.categoryHref,
      date_label: detail.date,
      datetime_label: detail.datetime,
      read_time: detail.readTime,
      image: detail.image ?? null,
      excerpt: null,
      author: detail.author,
      author_bio: detail.authorBio,
      layout: null,
      blocks: detail.blocks,
      is_published: true,
    });
  }

  function ensureArticle(article: {
    title: string;
    category: string;
    date: string;
    readTime?: string;
    image?: string;
    href: string;
    excerpt?: string;
    author?: string;
    layout?: string;
  }) {
    const path = toLocalArticleHref(article.href);
    if (!path.startsWith("/20") || articleMap.has(path)) return;
    const [year, month, day, ...slugParts] = path.slice(1).split("/");
    const slug = slugParts.join("/");
    articleMap.set(path, {
      path,
      slug,
      year,
      month,
      day,
      title: article.title,
      category_label: article.category,
      category_href: "/",
      date_label: article.date,
      datetime_label: `${article.date} 12:21 chiều`,
      read_time: article.readTime ?? "5 phút đọc",
      image: article.image ?? null,
      excerpt: article.excerpt ?? null,
      author: article.author ?? DEFAULT_AUTHOR,
      author_bio: DEFAULT_AUTHOR_BIO,
      layout: article.layout ?? null,
      blocks: article.excerpt
        ? [
            {
              type: "heading",
              text: `${article.title.split("–")[0]?.trim().toUpperCase()} LÀ GÌ`,
            },
            { type: "paragraph", text: article.excerpt },
          ]
        : [],
      is_published: true,
    });
  }

  [
    featuredArticle,
    ...secondaryNews,
    ...articleSections.flatMap((s) => s.articles),
    ...getThuocPage().articles,
    ...getGeneTherapyPage().articles,
    ...getVaccinesPage().articles,
    ...getSideEffectsPage().articles,
    ...getOtherNewsPage().articles,
    ...thuocSubcategorySlugs.flatMap(
      ({ slug, title }) => getThuocSubcategoryPage(slug, title)?.articles ?? [],
    ),
    ...geneTherapySubcategorySlugs.flatMap(
      ({ slug, title }) => getGeneTherapySubcategoryPage(slug, title)?.articles ?? [],
    ),
  ].forEach(ensureArticle);

  const articles = [...articleMap.values()];
  console.log(`Inserting ${articles.length} articles...`);
  for (let i = 0; i < articles.length; i += 20) {
    const batch = articles.slice(i, i + 20);
    const { error } = await supabase.from("articles").insert(batch);
    if (error) throw new Error(`articles batch ${i}: ${error.message}`);
  }

  const categories = [
    { slug: "thuoc", title: "Thuốc", kind: "archive", parent_slug: null, total_pages: 30, sort_order: 1 },
    { slug: "lieu-phap-gene-te-bao", title: "Liệu pháp Gene – Tế bào", kind: "archive", parent_slug: null, total_pages: 10, sort_order: 2 },
    { slug: "vaccines", title: "Vaccines", kind: "archive", parent_slug: null, total_pages: 5, sort_order: 3 },
    { slug: "tac-dung-phu", title: "Tác dụng phụ", kind: "archive", parent_slug: null, total_pages: 3, sort_order: 4 },
    { slug: "tin-khac", title: "Tin khác", kind: "archive", parent_slug: null, total_pages: 8, sort_order: 5 },
    { slug: "benh-hoc", title: "Bệnh học", kind: "glossary", parent_slug: null, total_pages: 1, sort_order: 6 },
    { slug: "xet-nghiem-chi-so", title: "Xét nghiệm & Chỉ số", kind: "glossary", parent_slug: null, total_pages: 1, sort_order: 7 },
    { slug: "thuat-ngu", title: "Thuật ngữ", kind: "glossary", parent_slug: null, total_pages: 1, sort_order: 8 },
    ...thuocSubcategorySlugs.map((item, index) => ({
      slug: `thuoc/${item.slug}`,
      title: item.title,
      kind: "subcategory",
      parent_slug: "thuoc",
      total_pages: item.slug === "ung-thu" ? 10 : 5,
      sort_order: 100 + index,
    })),
    ...geneTherapySubcategorySlugs.map((item, index) => ({
      slug: `lieu-phap-gene-te-bao/${item.slug}`,
      title: item.title,
      kind: "subcategory",
      parent_slug: "lieu-phap-gene-te-bao",
      total_pages: 5,
      sort_order: 200 + index,
    })),
  ];

  console.log(`Inserting ${categories.length} categories...`);
  {
    const { error } = await supabase.from("categories").insert(categories);
    if (error) throw new Error(`categories: ${error.message}`);
  }

  async function linkCategory(
    categorySlug: string,
    list: Array<{ href: string; layout?: string }>,
  ) {
    const rows = list.flatMap((article, index) => {
      const path = toLocalArticleHref(article.href);
      if (!path.startsWith("/20")) return [];
      return [
        {
          category_slug: categorySlug,
          article_path: path,
          sort_order: index,
          layout: article.layout ?? null,
        },
      ];
    });
    if (!rows.length) return;
    const { error } = await supabase.from("category_articles").upsert(rows);
    if (error) throw new Error(`category_articles ${categorySlug}: ${error.message}`);
  }

  await linkCategory("thuoc", getThuocPage().articles);
  await linkCategory("lieu-phap-gene-te-bao", getGeneTherapyPage().articles);
  await linkCategory("vaccines", getVaccinesPage().articles);
  await linkCategory("tac-dung-phu", getSideEffectsPage().articles);
  await linkCategory("tin-khac", getOtherNewsPage().articles);
  for (const { slug, title } of thuocSubcategorySlugs) {
    const page = getThuocSubcategoryPage(slug, title);
    if (page) await linkCategory(`thuoc/${slug}`, page.articles);
  }
  for (const { slug, title } of geneTherapySubcategorySlugs) {
    const page = getGeneTherapySubcategoryPage(slug, title);
    if (page) await linkCategory(`lieu-phap-gene-te-bao/${slug}`, page.articles);
  }

  console.log("Homepage sections...");
  {
    const { error } = await supabase.from("homepage_sections").insert(
      articleSections.map((section, index) => ({
        id: section.id,
        title: section.title,
        see_more_href: section.seeMoreHref,
        sort_order: index,
      })),
    );
    if (error) throw new Error(`homepage_sections: ${error.message}`);
  }

  console.log("Site settings...");
  {
    const { error } = await supabase.from("site_settings").insert([
      { key: "logo_src", value: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/thegioithuocmoi/TGTM-Final-06-750x254.png` },
      {
        key: "about_us",
        value: {
          title: "About Us",
          paragraphs: [
            "Thân chào bạn đến với Thế Giới Thuốc Mới, nền tảng trực tuyến cung cấp thông tin về thuốc mới, kết hợp điều trị mới, tác dụng phụ của thuốc, bệnh học và thuật ngữ chuyên ngành.",
            "Sứ mệnh của chúng tôi là truyền tải các kiến thức mới, đột phá trong ngành Y học & Dược phẩm đến với công chúng sớm nhất.",
            "Hãy đồng hành với chúng tôi để khám phá các kiến thức mới, định hình tương lai của ngành chăm sóc sức khỏe cộng đồng.",
          ],
          representative: "Nguyễn Tiến Sử MD, PhD, MBA",
          members: [
            "Bùi Quốc Thắng MD, PhD",
            "Hồ Minh Văn MD, PhD",
            "Nguyễn Bích Trân MD, PhD",
            "Hà Thị Hồng",
            "Bùi Văn Uy",
            "Nguyễn Quân Hoàng Uyên",
            "Thái Thành Tân",
          ],
          address: "2-4-14 Toukou-cho, Moriguchi-shi, Osaka, Japan, 570-0035",
        },
      },
    ]);
    if (error) throw new Error(`site_settings: ${error.message}`);
  }

  console.log("Navigation...");
  for (const [index, item] of navItems.entries()) {
    const { data, error } = await supabase
      .from("nav_items")
      .insert({
        label: item.label,
        href: item.href,
        has_dropdown: Boolean(item.hasDropdown),
        sort_order: index,
      })
      .select("id")
      .single();
    if (error) throw new Error(`nav_items: ${error.message}`);
    if (item.dropdownItems?.length) {
      const { error: dropError } = await supabase.from("nav_dropdown_items").insert(
        item.dropdownItems.map((sub, subIndex) => ({
          nav_item_id: data.id,
          text: sub.text,
          href: sub.href,
          sort_order: subIndex,
        })),
      );
      if (dropError) throw new Error(`nav_dropdown_items: ${dropError.message}`);
    }
  }

  console.log("Sidebar...");
  for (const [index, panel] of sidebarPanels.entries()) {
    const { error } = await supabase.from("sidebar_panels").insert({
      title: panel.title,
      see_all_href: panel.seeAllHref,
      category_slug: panel.categorySlug,
      sort_order: index,
    });
    if (error) throw new Error(`sidebar_panels: ${error.message}`);
  }

  console.log("Glossary...");
  {
    const { error } = await supabase.from("glossary_tabs").insert(
      glossaryTabs.map((tab, index) => ({
        id: tab.id,
        label: tab.label,
        href: tab.href,
        sort_order: index,
      })),
    );
    if (error) throw new Error(`glossary_tabs: ${error.message}`);
  }
  for (const tab of glossaryTabs) {
    const page = getGlossaryPage(tab.id);
    const rows = page.sections.flatMap((section) =>
      section.items.map((item, itemIndex) => ({
        tab_id: tab.id,
        letter: section.letter,
        text: item.text,
        href: item.href,
        sort_order: itemIndex,
      })),
    );
    const { error } = await supabase.from("glossary_entries").insert(rows);
    if (error) throw new Error(`glossary_entries ${tab.id}: ${error.message}`);
  }

  console.log("Seed complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
