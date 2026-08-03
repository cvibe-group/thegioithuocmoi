import type { Metadata } from "next";

const SITE_NAME = "Thế Giới Thuốc Mới";
const DEFAULT_DESCRIPTION =
  "Thông tin thuốc mới, bệnh học, xét nghiệm và liệu pháp gene-tế bào.";

export function getSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function absoluteUrl(path: string) {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildPageMetadata(options: {
  title: string;
  description?: string | null;
  path: string;
  image?: string | null;
  type?: "website" | "article";
}): Metadata {
  const title = options.title.includes(SITE_NAME)
    ? options.title
    : `${options.title} - ${SITE_NAME}`;
  const description =
    options.description?.trim() || DEFAULT_DESCRIPTION;
  const url = absoluteUrl(options.path);
  const image = options.image?.trim() || undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "vi_VN",
      type: options.type ?? "website",
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export function articleJsonLd(options: {
  title: string;
  description?: string | null;
  path: string;
  image?: string | null;
  datePublished?: string | null;
  dateModified?: string | null;
  author?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: options.title,
    description: options.description ?? undefined,
    image: options.image ?? undefined,
    datePublished: options.datePublished ?? undefined,
    dateModified: options.dateModified ?? undefined,
    author: options.author
      ? { "@type": "Person", name: options.author }
      : undefined,
    mainEntityOfPage: absoluteUrl(options.path),
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: getSiteUrl(),
    },
  };
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; path?: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}
