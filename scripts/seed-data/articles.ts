import type { Article, ArticleDetail } from "@/types/content";
import {
  getGeneTherapyPage,
  getOtherNewsPage,
  getSideEffectsPage,
  getThuocPage,
  getThuocSubcategoryPage,
  getVaccinesPage,
} from "./category-pages";
import { articleSections, featuredArticle, secondaryNews } from "./homepage";
import { thuocSubcategorySlugs } from "./navigation";

export const DEFAULT_AUTHOR = "Nguyễn Tiến Sử, MD, PhD, MBA";

export const DEFAULT_AUTHOR_BIO =
  "Tốt nghiệp Bác Sĩ Đa Khoa (MD), tại Đại Học Y Dược TP. HCM, VIETNAM (1995). Tốt nghiệp Tiến Sĩ Y Khoa (PhD), ngành Y Học Ứng Dụng Gene, tại Tokyo Medical and Dental University, JAPAN (2007). Tốt nghiệp Thạc Sĩ Quản Trị Kinh Doanh (MBA), tại University of Queensland, AUSTRALIA (2012). Hiện đang công tác trong lĩnh vực nghiên cứu và phát triển thuốc mới.";

/** Convert absolute thegioithuocmoi URLs (or keep local paths). */
export function toLocalArticleHref(href: string): string {
  if (!href || href === "#") return href;
  if (href.startsWith("/")) return href.replace(/\/$/, "");
  const match = href.match(
    /thegioithuocmoi\.com\/(\d{4})\/(\d{2})\/(\d{2})\/([^/?#]+)/,
  );
  if (match) {
    return `/${match[1]}/${match[2]}/${match[3]}/${match[4]}`;
  }
  return href;
}

export function parseArticlePath(href: string): {
  year: string;
  month: string;
  day: string;
  slug: string;
} | null {
  const local = toLocalArticleHref(href);
  const match = local.match(/^\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)$/);
  if (!match) return null;
  return { year: match[1], month: match[2], day: match[3], slug: match[4] };
}

function categoryHref(category: string): string {
  const map: Record<string, string> = {
    "Nội tiết - Chuyển hoá": "/thuoc/noi-tiet-chuyen-hoa",
    "Nội tiết – Chuyển hoá": "/thuoc/noi-tiet-chuyen-hoa",
    "Nội Tiết - Chuyển Hóa": "/thuoc/noi-tiet-chuyen-hoa",
    "Ung thư": "/thuoc/ung-thu",
    "Thận tiết niệu bàng quang": "/thuoc/than-tiet-nieu-bang-quang",
    "Nhiễm trùng": "/thuoc/nhiem-trung",
    "Nhiễm Trùng": "/thuoc/nhiem-trung",
    "Tai mũi họng": "/thuoc/tai-mui-hong",
    "Huyết học": "/thuoc/huyet-hoc",
    "Huyết học Nhiễm Trùng": "/thuoc/huyet-hoc",
    "Di truyền": "/thuoc/di-truyen",
    Vaccines: "/vaccines",
    "Tác dụng phụ": "/tac-dung-phu",
    "Tin khác": "/tin-khac",
    "Tin khác Tác dụng phụ": "/tac-dung-phu",
  };
  return map[category] ?? "/thuoc";
}

function stubBlocks(title: string, category: string, excerpt?: string): ArticleDetail["blocks"] {
  const shortName = title.split("–")[0]?.trim() || title;
  const intro =
    excerpt?.replace(/\s+/g, " ").trim() ||
    `${title} là một liệu pháp thuộc nhóm ${category}, được cập nhật trên Thế Giới Thuốc Mới nhằm cung cấp thông tin khoa học cho cộng đồng y tế.`;

  return [
    {
      type: "heading",
      text: `${shortName.toUpperCase()} LÀ GÌ`,
    },
    {
      type: "paragraph",
      text: intro,
    },
    {
      type: "heading",
      text: "THÔNG TIN CHÍNH",
    },
    {
      type: "paragraph",
      text: "Bài viết này tổng hợp các thông tin chính về chỉ định, cơ chế tác dụng và lưu ý lâm sàng dựa trên dữ liệu phê duyệt và tài liệu tham khảo chuyên ngành.",
    },
    {
      type: "list",
      items: [
        "Chỉ định điều trị theo phê duyệt của cơ quan quản lý dược phẩm.",
        "Cơ chế tác dụng nhắm đến đích phân tử liên quan đến bệnh lý.",
        "Theo dõi hiệu quả và an toàn trong thực hành lâm sàng.",
      ],
    },
  ];
}

const LIPFENDRA_BLOCKS: ArticleDetail["blocks"] = [
  {
    type: "heading",
    text: "LIPFENDRA LÀ GÌ",
  },
  {
    type: "paragraph",
    text: 'Là thuốc dạng viên uống, chứa hoạt chất enlicitide, là chất ức chế PCSK9, do Merck (MSD) nghiên cứu và phát triển. Lipfendra được chỉ định kết hợp với chế độ ăn uống và tập luyện để làm giảm nồng độ cholesterol lipoprotein tỷ trọng thấp (LDL-C – “cholesterol xấu”) ở người trưởng thành bị tăng cholesterol máu (hypercholesterolemia), bao gồm cả những bệnh nhân mắc tăng cholesterol máu gia đình thể dị hợp tử (HeFH).',
  },
  {
    type: "paragraph",
    text: "Chỉ định này được Cục Quản lý Thực phẩm và Dược phẩm Hoa Kỳ (FDA) phê duyệt vào tháng 7 năm 2026. Sự phê duyệt của Lipfendra đánh dấu một cột mốc lịch sử trong ngành tim mạch học: đây là thuốc ức chế PCSK9 dạng uống (oral) đầu tiên và duy nhất trên thế giới. Trước đây, tất cả các thuốc ức chế PCSK9 thế hệ cũ (như Repatha, Praluent hay Leqvio) đều phải tiêm dưới da, gây ra rào cản về tâm lý tiêm truyền hoặc phiền toái khi tuân thủ điều trị dài hạn cho bệnh nhân.",
  },
  {
    type: "heading",
    text: "CƠ CHẾ TÁC DỤNG",
  },
  {
    type: "paragraph",
    text: "Trong cơ thể, gan đóng vai trò chính trong việc lọc và loại bỏ cholesterol LDL khỏi máu thông qua các thụ thể LDL (LDL receptors) trên bề mặt tế bào gan. Tuy nhiên, protein PCSK9 (Proprotein Convertase Subtilisin/Kexin Type 9) gắn vào thụ thể LDL và kích hoạt sự phân hủy các thụ thể này. Sự suy giảm số lượng thụ thể LDL khiến gan không thể thu gom cholesterol LDL hiệu quả, làm gia tăng chỉ số mỡ xấu tích tụ trong lòng mạch và gây xơ vữa động mạch.",
  },
  {
    type: "paragraph",
    text: "Enlicitide thuộc nhóm peptide vòng vĩ mô (macrocyclic peptide) đột phá. Khác với các liệu pháp kháng thể đơn dòng kích thước lớn phải dùng đường tiêm, enlicitide có cấu trúc phân tử vừa đủ nhỏ để hấp thu qua đường tiêu hóa, đồng thời sở hữu lực liên kết cực mạnh với protein PCSK9. Bằng cách ức chế chọn lọc PCSK9, Lipfendra ngăn chặn PCSK9 gắn vào thụ thể LDL, giúp bảo vệ và tái sử dụng liên tục các thụ thể LDL trên tế bào gan.",
  },
  {
    type: "heading",
    text: "HIỆU QUẢ LÂM SÀNG",
  },
  {
    type: "paragraph",
    text: "Hiệu quả làm giảm mỡ máu ấn tượng của Lipfendra đã được khẳng định thông qua hai nghiên cứu lâm sàng Pha 3 then chốt trong chương trình CORALreef trên các bệnh nhân đang điều trị bằng statin liều tối đa chịu đựng được:",
  },
  {
    type: "list",
    items: [
      "Thử nghiệm CORALreef Lipids (tăng cholesterol máu nguyên phát): Tại tuần thứ 24, Lipfendra (20 mg/ngày) giúp giảm trung bình 56% nồng độ LDL-C so với nhóm giả dược (p < 0.001).",
      "Thử nghiệm CORALreef HeFH (tăng cholesterol máu gia đình thể dị hợp tử): Tại tuần thứ 24, Lipfendra giúp giảm trung bình 59% nồng độ LDL-C so với nhóm giả dược (p < 0.001).",
      "Giảm toàn diện các chỉ số lipoprotein gây xơ vữa: non-HDL-C giảm ~54% và Apolipoprotein B (ApoB) giảm ~50%.",
      "Đánh giá biến cố tim mạch dài hạn đang tiếp tục trong thử nghiệm CORALreef Outcomes trên hơn 14.500 bệnh nhân.",
    ],
  },
  {
    type: "heading",
    text: "ĐIỀU TRỊ VỚI LIPFENDRA VÀ LƯU Ý KHI SỬ DỤNG",
  },
  {
    type: "paragraph",
    text: "Lipfendra được bào chế dưới dạng viên nén uống hàm lượng 20 mg.",
  },
  {
    type: "list",
    items: [
      "Liều dùng: Uống 1 viên (20 mg) mỗi ngày một lần vào buổi sáng. Uống khi bụng đói cùng với nước lọc, cà phê đen hoặc trà nguyên chất. Nuốt nguyên viên, không bẻ, nghiền hoặc chẻ viên.",
      "Lưu ý thời gian: Sau khi uống, chờ ít nhất 30 phút mới ăn hoặc uống các loại thực phẩm/đồ uống khác.",
      "Tác dụng phụ: Trong các thử nghiệm lâm sàng Pha 3, tỷ lệ biến cố bất lợi tương đương nhóm giả dược.",
    ],
  },
];

function collectSourceArticles(): Article[] {
  const map = new Map<string, Article>();
  const push = (article: Article) => {
    const href = toLocalArticleHref(article.href);
    if (!href.startsWith("/20")) return;
    if (!map.has(href)) {
      map.set(href, { ...article, href });
    }
  };

  push(featuredArticle);
  secondaryNews.forEach(push);
  articleSections.forEach((section) => section.articles.forEach(push));
  [
    getThuocPage(),
    getGeneTherapyPage(),
    getVaccinesPage(),
    getSideEffectsPage(),
    getOtherNewsPage(),
    ...thuocSubcategorySlugs
      .map(({ slug, title }) => getThuocSubcategoryPage(slug, title))
      .filter((page): page is NonNullable<typeof page> => page !== null),
  ].forEach((page) => page.articles.forEach(push));

  return [...map.values()];
}

function buildDetail(article: Article): ArticleDetail | null {
  const path = parseArticlePath(article.href);
  if (!path) return null;

  const isLipfendra = path.slug.includes("lipfendra");
  const all = collectSourceArticles();
  const related = all
    .filter((a) => a.href !== article.href)
    .slice(0, 3)
    .map((a) => ({ ...a, href: toLocalArticleHref(a.href), readTime: a.readTime ?? "5 phút đọc" }));

  const dateParts = article.date.split(".");
  const datetime =
    dateParts.length === 3
      ? `${dateParts[0]}.${dateParts[1]}.${dateParts[2]} 12:21 chiều`
      : `${article.date} 12:21 chiều`;

  return {
    ...path,
    category: article.category,
    categoryHref: categoryHref(article.category),
    title: article.title,
    date: article.date,
    datetime,
    readTime: article.readTime ?? "5 phút đọc",
    image: article.image,
    author: DEFAULT_AUTHOR,
    authorBio: DEFAULT_AUTHOR_BIO,
    blocks: isLipfendra
      ? LIPFENDRA_BLOCKS
      : stubBlocks(article.title, article.category, article.excerpt),
    related,
  };
}

const articleDetails = collectSourceArticles()
  .map(buildDetail)
  .filter((a): a is ArticleDetail => a !== null);

const articleByKey = new Map(
  articleDetails.map((a) => [`${a.year}/${a.month}/${a.day}/${a.slug}`, a]),
);

export function getAllArticleParams() {
  return articleDetails.map(({ year, month, day, slug }) => ({
    year,
    month,
    day,
    slug,
  }));
}

export function getArticleDetail(
  year: string,
  month: string,
  day: string,
  slug: string,
): ArticleDetail | null {
  return articleByKey.get(`${year}/${month}/${day}/${slug}`) ?? null;
}

export function searchArticles(query: string): Article[] {
  const q = query.trim().toLowerCase();
  if (!q) return collectSourceArticles().slice(0, 8);
  return collectSourceArticles()
    .filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q),
    )
    .slice(0, 12);
}
