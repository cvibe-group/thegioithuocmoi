import type { Article, ArticleSection } from "@/types/content";

const img = (name: string) =>
  `https://iweejgtuyzdmdjdjmxiq.supabase.co/storage/v1/object/public/images/thegioithuocmoi/${name}`;

export { navItems, LOGO_SRC } from "./navigation";
export { sidebarPanels } from "./sidebar";

export const featuredArticle: Article = {
  category: "Tin khác",
  title: "Lịch sử ra đời của máy chụp X-Quang: Bước ngoặt vĩ đại trong Y học chẩn đoán",
  date: "22.07.2026",
  readTime: "5 phút đọc",
  image: img("IMG_1357.jpeg"),
  href: "/2026/07/22/lich-su-ra-doi-cua-may-chup-x-quang-buoc-ngoat-vi-dai-trong-y-hoc-chan-doan",
};

export const secondaryNews: Article[] = [
  {
    category: "Tin khác",
    title: "Lịch sử ra đời của Máy đo điện tim (ECG) và khái niệm y tế từ xa hình thành",
    date: "21.07.2026",
    readTime: "5 phút đọc",
    href: "/2026/07/21/lich-su-ra-doi-cua-may-do-dien-tim-ecg-tu-co-may-nang-3-ta-den-chiec-smartwatch-tren-co-tay",
  },
  {
    category: "Tin khác",
    title: "Lịch sử ra đời của máy siêu âm: Từ công nghệ quân sự đến “Mắt Thần” của Y khoa",
    date: "20.07.2026",
    readTime: "5 phút đọc",
    href: "/2026/07/20/lich-su-ra-doi-cua-may-sieu-am-tu-cong-nghe-quan-su-den-mat-than-cua-y-khoa",
  },
  {
    category: "Tin khác",
    title: "Găng tay y tế được sử dụng trong phòng mổ từ khi nào?",
    date: "19.07.2026",
    readTime: "5 phút đọc",
    href: "/2026/07/19/gang-tay-y-te-duoc-su-dung-trong-phong-mo-tu-khi-nao",
  },
];

export const articleSections: ArticleSection[] = [
  {
    id: "thuoc",
    title: "Thuốc",
    seeMoreHref: "/thuoc",
    articles: [
      {
        category: "Nội tiết - Chuyển hoá",
        title: "Lipfendra – Thuốc ức chế PCSK9 dạng uống đầu tiên trên thế giới điều trị tăng cholesterol máu",
        date: "18.07.2026",
        image: img("IMG_3228-300x295.jpeg"),
        href: "/2026/07/18/lipfendra-enlicitide-thuoc-uc-che-pcsk9-dang-uong-dau-tien-tren-the-gioi-dieu-tri-tang-cholesterol-mau",
      },
      {
        category: "Ung thư",
        title: "Revtorpyk – Thuốc ức chế kép PI3K/mTOR thế hệ mới cho ung thư vú tiến triển HR+/HER2-",
        date: "18.07.2026",
        image: img("IMG_3645-300x300.jpeg"),
        href: "/2026/07/18/revtorpyk-thuoc-uc-che-kep-pi3k-mtor-the-he-moi-cho-ung-thu-vu-tien-trien-hr-her2",
      },
      {
        category: "Thận tiết niệu bàng quang",
        title: "Trutakna – Thuốc ức chế kép BAFF/APRIL giúp giảm mạnh đạm niệu ở bệnh cầu thận IgA",
        date: "08.07.2026",
        image: img("IMG_3645-300x300.jpeg"),
        href: "/2026/07/08/trutakna-thuoc-uc-che-kep-baff-april-duong-tiem-dau-tien-giup-giam-manh-dam-nieu-o-benh-nhan-viem-cau-than-iga",
      },
      {
        category: "Nội tiết - Chuyển hoá",
        title: "Lumvoa – Liệu pháp nhắm đến IGF-1R cho bệnh mắt tuyến giáp",
        date: "08.07.2026",
        image: img("IMG_0378-209x300.jpeg"),
        href: "/2026/07/08/lumvoa-lieu-phap-nham-den-igf-1r-cho-benh-mat-tuyen-giap",
      },
      {
        category: "Nhiễm trùng",
        title: "Utebzi – Kháng sinh Carbapenem đường uống đầu tiên cho nhiễm trùng đường tiết niệu phức tạp",
        date: "08.07.2026",
        image: img("Tablets-300x293.jpeg"),
        href: "/2026/07/08/utebzi-khang-sinh-carbapenem-duong-uong-dau-tien-cho-nhiem-trung-duong-tiet-nieu-phuc-tap",
      },
      {
        category: "Nhiễm trùng",
        title: "Xocova – Thuốc viên đường uống đầu tiên và duy nhất giúp dự phòng sau phơi nhiễm COVID-19",
        date: "08.07.2026",
        image: img("IMG_3704-300x296.jpeg"),
        href: "/2026/07/08/xocova-thuoc-vien-duong-uong-dau-tien-va-duy-nhat-giup-du-phong-sau-phoi-nhiem-covid-19",
      },
    ],
  },
  {
    id: "gene-therapy",
    title: "Liệu pháp gene - tế bào",
    seeMoreHref: "/lieu-phap-gene-te-bao",
    articles: [
      {
        category: "Tai mũi họng",
        title: "Otarmeni – Liệu pháp gen đầu tiên trên thế giới phục hồi thính lực tự nhiên cho bệnh nhân điếc di truyền",
        date: "24.04.2026",
        image: img("IMG_3668-290x300.jpeg"),
        href: "/2026/04/24/otarmeni-lieu-phap-gen-dau-tien-tren-the-gioi-phuc-hoi-thinh-luc-tu-nhien-cho-benh-nhan-diec-di-truyen",
      },
      {
        category: "Huyết học Nhiễm Trùng",
        title: "Kresladi – Liệu pháp gen đầu tiên cho khiếm khuyết tính bám dính của bạch cầu loại I",
        date: "27.03.2026",
        image: img("IMG_3766-300x297.jpeg"),
        href: "/2026/03/27/kresladi-lieu-phap-gen-dau-tien-cho-chung-khiem-khuyet-tinh-bam-dinh-bach-cau-loai-i",
      },
      {
        category: "Nội Tiết - Chuyển Hóa",
        title: "Redemplo – Thuốc mới điều trị Hội chứng chylomicron huyết có tính gia đình",
        date: "19.11.2025",
        image: img("IMG_3673-300x298.jpeg"),
        href: "/2025/11/19/redemplo-thuoc-moi-dieu-tri-hoi-chung-chylomicron-huyet-co-tinh-gia-dinh",
      },
      {
        category: "Di truyền",
        title: "Dawnzera – Thuốc mới điều trị phù mạch di truyền",
        date: "19.11.2025",
        image: img("IMG_3673-300x298.jpeg"),
        href: "/2025/11/19/dawnzera-thuoc-moi-dieu-tri-phu-mach-di-truyen",
      },
      {
        category: "Di truyền",
        title: "Andembry – Thuốc mới điều trị phù mạch đi truyền",
        date: "19.11.2025",
        image: img("IMG_3673-300x298.jpeg"),
        href: "/2025/11/19/andembry-thuoc-moi-dieu-tri-phu-mach-di-truyen",
      },
      {
        category: "Huyết học",
        title: "Qfitlia – Phương pháp điều trị mới cho Hemophilia A hoặc B",
        date: "19.11.2025",
        image: img("IMG_3673-300x298.jpeg"),
        href: "/2025/11/19/qfitlia-phuong-phap-dieu-tri-moi-cho-hemophilia-a-hoac-b",
      },
    ],
  },
  {
    id: "vaccine",
    title: "Vaccine",
    seeMoreHref: "/vaccines",
    articles: [
      {
        category: "Vaccines",
        title: "Penmenvy – Vaccine mới phòng ngừa bệnh não mô cầu",
        date: "16.02.2025",
        image: img("IMG_3202-297x300.jpeg"),
        href: "/2025/02/16/penmenvy-vaccine-phong-ngua-viem-nao-mo-cau",
      },
      {
        category: "Vaccines",
        title: "Vimkunya – Vaccine mới phòng bệnh do virus Chikungunya",
        date: "16.02.2025",
        image: img("IMG_0212-300x290.jpeg"),
        href: "/2025/02/16/vimkunya-vaccine-moi-phong-benh-do-virus-chikungunya",
      },
      {
        category: "Vaccines",
        title: "Capvaxine – Vaccine mới phòng ngừa viêm phổi do phế cầu khuẩn",
        date: "20.06.2024",
        image: img("IMG_2778-1-300x294.jpeg"),
        href: "/2024/06/20/capvaxine-vaccine-moi-phong-ngua-viem-phoi",
      },
      {
        category: "Vaccines",
        title: "mRESVIA – Vaccine phòng bệnh đường hô hấp dưới do virus hợp bào hô hấp",
        date: "20.06.2024",
        image: img("IMG_2778-1-300x294.jpeg"),
        href: "/2024/06/20/mresvia-vaccine-phong-benh-duong-ho-hap-duoi-do-virus-hop-bao-ho-hap",
      },
      {
        category: "Vaccines",
        title: "5 loại vaccine điều trị ung thư được kỳ vọng trong tương lai",
        date: "20.06.2024",
        image: img("IMG_2778-1-300x294.jpeg"),
        href: "/2024/06/20/5-loai-vaccine-dieu-tri-ung-thu-duoc-ky-vong-trong-tuong-lai",
      },
      {
        category: "Vaccines",
        title: "Ixchiq – Vaccine đầu tiên phòng bệnh do virus Chikungunya",
        date: "20.06.2024",
        image: img("IMG_2778-1-300x294.jpeg"),
        href: "/2024/06/20/ixchiq-vaccine-dau-tien-phong-benh-do-virus-chikungunya",
      },
    ],
  },
  {
    id: "side-effects",
    title: "Tác dụng phụ",
    seeMoreHref: "/tac-dung-phu",
    articles: [
      {
        category: "Tác dụng phụ",
        title: "ICANS",
        date: "25.02.2024",
        image: img("IMG_0197-300x279.jpeg"),
        href: "/2024/02/25/tac-dung-phu-icans",
      },
      {
        category: "Tác dụng phụ",
        title: "Sốc phản vệ do thuốc",
        date: "28.10.2023",
        image: img("IMG_3751-300x295.jpeg"),
        href: "/2023/10/28/tac-dung-phu-soc-phan-ve-do-thuoc",
      },
      {
        category: "Tác dụng phụ",
        title: "Hội chứng tái cấu trúc miễn dịch do thuốc",
        date: "15.07.2023",
        image: img("IMG_3752-300x292.jpeg"),
        href: "/2023/07/15/tac-dung-phu-hoi-chung-tai-cau-truc-mien-dich-do-thuoc",
      },
      {
        category: "Tác dụng phụ",
        title: "DRESS",
        date: "15.07.2023",
        image: img("IMG_3753-300x293.jpeg"),
        href: "/2023/07/15/tac-dung-phu-dress",
      },
      {
        category: "Tác dụng phụ",
        title: "Sốt giảm bạch cầu trung tính",
        date: "15.07.2023",
        image: img("IMG_3754-300x296.jpeg"),
        href: "/2023/07/15/tac-dung-phu-sot-giam-bach-cau-trung-tinh",
      },
      {
        category: "Tin khác Tác dụng phụ",
        title: "Các thuật ngữ thường dùng trong cảnh giác dược",
        date: "15.07.2023",
        image: img("IMG_2813-1-300x294.jpeg"),
        href: "/2023/07/15/cac-thuat-ngu-thuong-dung-trong-canh-giac-duoc",
      },
    ],
  },
  {
    id: "other-news",
    title: "Tin khác",
    seeMoreHref: "/tin-khac",
    articles: [
      {
        category: "Tin khác",
        title: "Lịch sử ra đời của máy chụp X-Quang: Bước ngoặt vĩ đại trong Y học chẩn đoán",
        date: "22.07.2026",
        image: img("IMG_1357-217x300.jpeg"),
        href: "/2026/07/22/lich-su-ra-doi-cua-may-chup-x-quang-buoc-ngoat-vi-dai-trong-y-hoc-chan-doan",
      },
      {
        category: "Tin khác",
        title: "Lịch sử ra đời của Máy đo điện tim (ECG) và khái niệm y tế từ xa hình thành",
        date: "21.07.2026",
        image: img("IMG_1351-300x257.jpeg"),
        href: "/2026/07/21/lich-su-ra-doi-cua-may-do-dien-tim-ecg-tu-co-may-nang-3-ta-den-chiec-smartwatch-tren-co-tay",
      },
      {
        category: "Tin khác",
        title: "Lịch sử ra đời của máy siêu âm: Từ công nghệ quân sự đến “Mắt Thần” của Y khoa",
        date: "20.07.2026",
        image: img("IMG_1350-300x242.jpeg"),
        href: "/2026/07/20/lich-su-ra-doi-cua-may-sieu-am-tu-cong-nghe-quan-su-den-mat-than-cua-y-khoa",
      },
      {
        category: "Tin khác",
        title: "Găng tay y tế được sử dụng trong phòng mổ từ khi nào?",
        date: "19.07.2026",
        image: img("IMG_1305-1-300x206.jpeg"),
        href: "/2026/07/19/gang-tay-y-te-duoc-su-dung-trong-phong-mo-tu-khi-nao",
      },
      {
        category: "Tin khác",
        title: "Lịch sử ra đời ống nghe y khoa và nghịch lý đau lòng về người phát minh ra nó",
        date: "19.07.2026",
        image: img("IMG_1347-300x165.jpeg"),
        href: "/2026/07/19/lich-su-ra-doi-ong-nghe-y-khoa-va-nghich-ly-dau-long-ve-nguoi-phat-minh-ra-no",
      },
      {
        category: "Tin khác",
        title: "Ca phê giúp bảo vệ gan và ngăn ngừa tình trạng gan nhiễm mỡ?",
        date: "19.07.2026",
        image: img("IMG_1270-300x161.jpeg"),
        href: "/2026/07/19/ca-phe-giup-bao-ve-gan-va-ngan-ngua-tinh-trang-gan-nhiem-mo",
      },
    ],
  },
];

