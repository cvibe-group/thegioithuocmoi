import type { Article, CategoryPageData } from "@/types/content";
import { articleSections } from "./homepage";

const img = (name: string) =>
  `https://iweejgtuyzdmdjdjmxiq.supabase.co/storage/v1/object/public/images/thegioithuocmoi/${name}`;

const thuocExtraArticles: Article[] = [
  {
    category: "Nhiễm trùng",
    title: "Zaynich – Kháng sinh phối hợp đột phá thế hệ mới cho nhiễm trùng đường tiết niệu phức tạp",
    date: "08.07.2026",
    readTime: "5 phút đọc",
    image: img("Tablets-300x293.jpeg"),
    href: "/2026/07/08/zaynich-khang-sinh-phoi-hop-dot-pha-the-he-moi-cho-nhiem-trung-duong-tiet-nieu-p",
    layout: "card",
  },
  {
    category: "Ung thư",
    title: "Decnupaz – Liệu pháp nhắm trúng đích CD123 đầu tiên cho bệnh nhân ung thư máu cực hiếm",
    date: "08.07.2026",
    readTime: "5 phút đọc",
    image: img("IMG_3645-300x300.jpeg"),
    href: "/2026/07/08/decnupaz-lieu-phap-nham-trung-dich-cd123-dau-tien-cho-benh-nhan-ung-thu-mau-cuc-",
    layout: "card",
  },
  {
    category: "Tim mạch",
    title: "Baxfendy – Thuốc ức chế tổng hợp Aldosterone đầu tiên cho bệnh nhân cao huyết áp khó kiểm soát",
    date: "08.07.2026",
    readTime: "5 phút đọc",
    image: img("IMG_3228-300x295.jpeg"),
    href: "/2026/07/08/baxfendy-thuoc-uc-che-tong-hop-aldosterone-dau-tien-cho-benh-nhan-cao-huyet-ap-k",
    layout: "card",
  },
  {
    category: "Nhiễm trùng",
    title: "Utebzi – Kháng sinh Carbapenem đường uống đầu tiên cho nhiễm trùng đường tiết niệu phức tạp",
    date: "08.07.2026",
    readTime: "5 phút đọc",
    image: img("Tablets-300x293.jpeg"),
    href: "/2026/07/08/utebzi-khang-sinh-carbapenem-duong-uong-dau-tien-cho-nhiem-trung-duong-tiet-nieu",
    author: "Nguyễn Tiến Sử, MD, PhD, MBA",
    excerpt: "UTEBZI LÀ GÌ Là một kháng sinh phổ rộng thuộc nhóm Carbapenem, được phát triển dưới dạng viên uống đầu tiên trên thế giới...",
    layout: "wide",
  },
  {
    category: "Nhiễm trùng",
    title: "Xocova – Thuốc viên đường uống đầu tiên và duy nhất giúp dự phòng sau phơi nhiễm COVID-19",
    date: "08.07.2026",
    readTime: "5 phút đọc",
    image: img("IMG_3704-300x296.jpeg"),
    href: "/2026/07/08/xocova-thuoc-vien-duong-uong-dau-tien-va-duy-nhat-giup-du-phong-sau-phoi-nhiem-c",
    author: "Nguyễn Tiến Sử, MD, PhD, MBA",
    excerpt: "XOCOVA LÀ GÌ Là một liệu pháp kháng virus dạng viên uống, được sử dụng để dự phòng sau phơi nhiễm COVID-19...",
    layout: "wide",
  },
  {
    category: "Nội tiết - Chuyển hoá",
    title: "Foundayo – Thuốc viên GLP-1 none-peptide đầu tiên trong kiểm soát cân nặng và đường huyết",
    date: "08.07.2026",
    readTime: "5 phút đọc",
    image: img("IMG_0378-209x300.jpeg"),
    href: "/2026/07/08/foundayo-thuoc-vien-glp-1-none-peptide-dau-tien-trong-kiem-soat-can-nang-va-duon",
    layout: "card",
  },
  {
    category: "Nội tiết - Chuyển hoá",
    title: "Awiqli – Insulin đầu tiên và duy nhất dùng một lần mỗi tuần cho người tiểu đường Type 2",
    date: "08.07.2026",
    readTime: "5 phút đọc",
    image: img("IMG_0378-209x300.jpeg"),
    href: "/2026/07/08/awiqli-insulin-dau-tien-va-duy-nhat-dung-mot-lan-moi-tuan-cho-nguoi-tieu-duong-t",
    layout: "card",
  },
  {
    category: "Ung thư",
    title: "Lifyorli – thuốc ức chế thụ thể Glucocorticoid đầu tiên điều trị ung thư buồng trứng kháng Platinum",
    date: "08.07.2026",
    readTime: "5 phút đọc",
    image: img("IMG_3645-300x300.jpeg"),
    href: "/2026/07/08/lifyorli-thuoc-uc-che-thu-the-glucocorticoid-dau-tien-dieu-tri-ung-thu-buong-tru",
    layout: "card",
  },
];

const ungThuArticles: Article[] = [
  {
    category: "Ung thư",
    title: "Revtorpyk – Thuốc ức chế kép PI3K/mTOR thế hệ mới cho ung thư vú tiến triển HR+/HER2-",
    date: "18.07.2026",
    readTime: "5 phút đọc",
    image: img("IMG_3645-300x300.jpeg"),
    href: "/2026/07/18/revtorpyk-thuoc-uc-che-kep-pi3k-mtor-the-he-moi-cho-ung-thu-vu-tien-trien-hr-her",
  },
  {
    category: "Ung thư",
    title: "Decnupaz – Liệu pháp nhắm trúng đích CD123 đầu tiên cho bệnh nhân ung thư máu cực hiếm",
    date: "08.07.2026",
    readTime: "5 phút đọc",
    image: img("IMG_3645-300x300.jpeg"),
    href: "/2026/07/08/decnupaz-lieu-phap-nham-trung-dich-cd123-dau-tien-cho-benh-nhan-ung-thu-mau-cuc-",
    layout: "card",
  },
  {
    category: "Ung thư",
    title: "Beqalzi – Thuốc mới điều trị U lympho tế bào vỏ tái phát hoặc kháng trị",
    date: "08.07.2026",
    readTime: "5 phút đọc",
    href: "/2026/07/08/beqalzi-thuoc-moi-dieu-tri-u-lympho-te-bao-vo-tai-phat-hoac-khang-tri",
    layout: "card",
  },
  {
    category: "Ung thư",
    title: "Veppanu – Thuốc uống với cơ chế mới đầu tiên trong điều trị ung thư vú",
    date: "08.07.2026",
    readTime: "5 phút đọc",
    href: "/2026/07/08/veppanu-thuoc-uong-voi-co-che-moi-dau-tien-trong-dieu-tri-ung-thu-vu",
    layout: "card",
  },
  {
    category: "Ung thư",
    title: "Lifyorli – thuốc ức chế thụ thể Glucocorticoid đầu tiên điều trị ung thư buồng trứng kháng Platinum",
    date: "08.07.2026",
    readTime: "5 phút đọc",
    image: img("IMG_3645-300x300.jpeg"),
    href: "/2026/07/08/lifyorli-thuoc-uc-che-thu-the-glucocorticoid-dau-tien-dieu-tri-ung-thu-buong-tru",
    author: "Nguyễn Tiến Sử, MD, PhD, MBA",
    excerpt: "LIFYORLI LÀ GÌ Là một loại thuốc uống, chứa relacorilant, thuốc ức chế thụ thể glucocorticoid đầu tiên...",
    layout: "wide",
  },
  {
    category: "Ung thư",
    title: "Hyrnuo – Thuốc mới điều trị ung thư phổi không phải tế bào nhỏ",
    date: "08.07.2026",
    readTime: "5 phút đọc",
    image: img("IMG_3645-300x300.jpeg"),
    href: "/2026/07/08/hyrnuo-thuoc-moi-dieu-tri-ung-thu-phoi-khong-phai-te-bao-nho",
    author: "Nguyễn Tiến Sử, MD, PhD, MBA",
    excerpt: "HYRNUO LÀ GÌ Là thuốc dạng viên uóng, chứa sunvozertinib, chất ức chế kinase...",
    layout: "wide",
  },
  {
    category: "Ung thư",
    title: "Komzifti – Thuốc mới điều trị bệnh bạch cầu cấp dòng tủy",
    date: "08.07.2026",
    readTime: "5 phút đọc",
    href: "/2026/07/08/komzifti-thuoc-moi-dieu-tri-benh-bach-cau-cap-dong-tuy",
    layout: "card",
  },
  {
    category: "Ung thư",
    title: "Inluriyo – Thuốc mới điều trị ung thư vú",
    date: "08.07.2026",
    readTime: "5 phút đọc",
    href: "/2026/07/08/inluriyo-thuoc-moi-dieu-tri-ung-thu-vu",
    layout: "card",
  },
  {
    category: "Ung thư",
    title: "Hernexeos – Thuốc mới điều trị ung thư phổi không phải tế bào nhỏ",
    date: "08.07.2026",
    readTime: "5 phút đọc",
    href: "/2026/07/08/hernexeos-thuoc-moi-dieu-tri-ung-thu-phoi-khong-phai-te-bao-nho",
    layout: "card",
  },
];

function getSectionArticles(id: string): Article[] {
  return articleSections.find((s) => s.id === id)?.articles ?? [];
}

function withReadTime(articles: Article[]): Article[] {
  return articles.map((a) => ({
    ...a,
    readTime: a.readTime ?? "5 phút đọc",
  }));
}

function buildCategoryPage(
  title: string,
  articles: Article[],
  parent?: { label: string; href: string },
  totalPages = 30,
): CategoryPageData {
  const breadcrumbs = parent
    ? [{ label: "Trang chủ", href: "/" }, { label: parent.label, href: parent.href }, { label: title }]
    : [{ label: "Trang chủ", href: "/" }, { label: title }];

  return {
    title,
    breadcrumbs,
    articles: withReadTime(articles),
    totalPages,
    currentPage: 1,
  };
}

export function getThuocPage(): CategoryPageData {
  const base = getSectionArticles("thuoc");
  return buildCategoryPage("Thuốc", [...base, ...thuocExtraArticles]);
}

export function getThuocSubcategoryPage(slug: string, title: string): CategoryPageData | null {
  if (slug === "ung-thu") {
    return buildCategoryPage(title, ungThuArticles, { label: "Thuốc", href: "/thuoc" }, 10);
  }

  const filtered = getSectionArticles("thuoc").filter(
    (a) => a.category.toLowerCase().includes(title.split(" ")[0]?.toLowerCase() ?? ""),
  );
  const articles = filtered.length > 0 ? filtered : getSectionArticles("thuoc").slice(0, 6);
  return buildCategoryPage(title, articles, { label: "Thuốc", href: "/thuoc" });
}

export function getGeneTherapyPage(): CategoryPageData {
  return buildCategoryPage("Liệu pháp Gene – Tế bào", getSectionArticles("gene-therapy"));
}

export function getGeneTherapySubcategoryPage(slug: string, title: string): CategoryPageData | null {
  const filtered = getSectionArticles("gene-therapy").filter(
    (a) => a.category.toLowerCase().includes(title.split(" ")[0]?.toLowerCase() ?? ""),
  );
  const articles = filtered.length > 0 ? filtered : getSectionArticles("gene-therapy").slice(0, 6);
  return buildCategoryPage(title, articles, { label: "Liệu pháp Gene – Tế bào", href: "/lieu-phap-gene-te-bao" });
}

export function getVaccinesPage(): CategoryPageData {
  return buildCategoryPage("Vaccines", getSectionArticles("vaccine"), undefined, 5);
}

export function getSideEffectsPage(): CategoryPageData {
  return buildCategoryPage("Tác dụng phụ", getSectionArticles("side-effects"), undefined, 3);
}

export function getOtherNewsPage(): CategoryPageData {
  return buildCategoryPage("Tin khác", getSectionArticles("other-news"), undefined, 8);
}
