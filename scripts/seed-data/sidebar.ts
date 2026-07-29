export type SidebarSeedPanel = {
  title: string;
  seeAllHref: string;
  categorySlug: string;
};

export const sidebarPanels: SidebarSeedPanel[] = [
  {
    title: "Bệnh học",
    seeAllHref: "/benh-hoc",
    categorySlug: "benh-hoc",
  },
  {
    title: "Xét nghiệm & Chỉ số",
    seeAllHref: "/xet-nghiem-chi-so",
    categorySlug: "xet-nghiem-chi-so",
  },
  {
    title: "Thuật ngữ",
    seeAllHref: "/thuat-ngu",
    categorySlug: "thuat-ngu",
  },
];
