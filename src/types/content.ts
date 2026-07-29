export interface Article {
  category: string;
  title: string;
  date: string;
  readTime?: string;
  image?: string;
  href: string;
  excerpt?: string;
  author?: string;
  layout?: "card" | "wide";
}

export interface ArticleBlock {
  type: "heading" | "paragraph" | "list";
  text?: string;
  items?: string[];
}

export interface ArticleDetail {
  slug: string;
  year: string;
  month: string;
  day: string;
  category: string;
  categoryHref: string;
  title: string;
  date: string;
  datetime: string;
  readTime: string;
  image?: string;
  author: string;
  authorBio: string;
  authorImage?: string;
  blocks: ArticleBlock[];
  related: Article[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface CategoryPageData {
  title: string;
  breadcrumbs: BreadcrumbItem[];
  articles: Article[];
  totalPages: number;
  currentPage?: number;
}

export interface GlossaryEntry {
  text: string;
  href: string;
}

/** Term used for in-article highlight + hover tooltip. */
export type GlossaryTooltipTerm = {
  term: string;
  href: string;
  excerpt: string;
};

export interface GlossarySection {
  letter: string;
  items: GlossaryEntry[];
}

export interface GlossaryPageData {
  /** Category slug with kind=glossary (e.g. benh-hoc). */
  activeTab: string;
  sections: GlossarySection[];
}

export interface ArticleSection {
  id: string;
  title: string;
  seeMoreHref: string;
  articles: Article[];
}

export interface SidebarPanel {
  title: string;
  seeAllHref: string;
  items: { text: string; href: string }[];
}

export interface NavDropdownItem {
  text: string;
  href: string;
}

export interface NavItem {
  label: string;
  href: string;
  hasDropdown?: boolean;
  dropdownItems?: NavDropdownItem[];
}
