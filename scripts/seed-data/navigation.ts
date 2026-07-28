import type { NavItem } from "@/types/content";

const thuocDropdown = [
  { text: "Cơ xương khớp", href: "/thuoc/co-xuong-khop" },
  { text: "Da liễu", href: "/thuoc/da-lieu" },
  { text: "Di truyền", href: "/thuoc/di-truyen" },
  { text: "Hô hấp", href: "/thuoc/ho-hap" },
  { text: "Huyết học", href: "/thuoc/huyet-hoc" },
  { text: "Miễn dịch – Dị ứng", href: "/thuoc/mien-dich" },
  { text: "Nhãn khoa", href: "/thuoc/nhan-khoa" },
  { text: "Nhiễm trùng", href: "/thuoc/nhiem-trung" },
  { text: "Nội tiết – Chuyển hoá", href: "/thuoc/noi-tiet-chuyen-hoa" },
  { text: "Sản phụ khoa", href: "/thuoc/san-phu-khoa" },
  { text: "Tai mũi họng", href: "/thuoc/tai-mui-hong" },
  { text: "Thẩm mỹ", href: "/thuoc/tham-my" },
  { text: "Thần kinh", href: "/thuoc/than-kinh" },
  { text: "Thận tiết niệu bàng quang", href: "/thuoc/than-tiet-nieu-bang-quang" },
  { text: "Tiêu hóa gan mật", href: "/thuoc/tieu-hoa-gan-mat" },
  { text: "Tim mạch", href: "/thuoc/tim-mach" },
  { text: "Ung thư", href: "/thuoc/ung-thu" },
];

const geneTherapyDropdown = [
  { text: "Cơ xương khớp", href: "/lieu-phap-gene-te-bao/co-xuong-khop-lieu-phap-gene-te-bao" },
  { text: "Da liễu", href: "/lieu-phap-gene-te-bao/da-lieu-lieu-phap-gene-te-bao" },
  { text: "Di truyền", href: "/lieu-phap-gene-te-bao/di-truyen-lieu-phap-gene-te-bao" },
  { text: "Hô hấp", href: "/lieu-phap-gene-te-bao/ho-hap-lieu-phap-gene-te-bao" },
  { text: "Huyết học", href: "/lieu-phap-gene-te-bao/huyet-hoc-lieu-phap-gene-te-bao" },
  { text: "Miễn Dịch – Dị Ứng", href: "/lieu-phap-gene-te-bao/mien-dich-di-ung" },
  { text: "Nhãn Khoa", href: "/lieu-phap-gene-te-bao/nhan-khoa-lieu-phap-gene-te-bao" },
  { text: "Nhiễm Trùng", href: "/lieu-phap-gene-te-bao/nhiem-trung-lieu-phap-gene-te-bao" },
  { text: "Nội Tiết – Chuyển Hóa", href: "/lieu-phap-gene-te-bao/noi-tiet-chuyen-hoa-lieu-phap-gene-te-bao" },
  { text: "Sản phụ khoa", href: "/lieu-phap-gene-te-bao/san-phu-khoa-lieu-phap-gene-te-bao" },
  { text: "Tai mũi họng", href: "/lieu-phap-gene-te-bao/tai-mui-hong-lieu-phap-gene-te-bao" },
  { text: "Thẩm mỹ", href: "/lieu-phap-gene-te-bao/tham-my-lieu-phap-gene-te-bao" },
  { text: "Thần kinh", href: "/lieu-phap-gene-te-bao/than-kinh-lieu-phap-gene-te-bao" },
  { text: "Thận tiết niệu bàng quang", href: "/lieu-phap-gene-te-bao/than-tiet-nieu-bang-quang-lieu-phap-gene-te-bao" },
  { text: "Tiêu hóa gan mật", href: "/lieu-phap-gene-te-bao/tieu-hoa-gan-mat-lieu-phap-gene-te-bao" },
  { text: "Tim mạch", href: "/lieu-phap-gene-te-bao/tim-mach-lieu-phap-gene-te-bao" },
  { text: "Ung thư", href: "/lieu-phap-gene-te-bao/ung-thu-lieu-phap-gene-te-bao" },
];

export const navItems: NavItem[] = [
  { label: "Thuốc", href: "/thuoc", hasDropdown: true, dropdownItems: thuocDropdown },
  { label: "Liệu pháp Gene – Tế bào", href: "/lieu-phap-gene-te-bao", hasDropdown: true, dropdownItems: geneTherapyDropdown },
  { label: "Vaccines", href: "/vaccines" },
  { label: "Tác dụng phụ", href: "/tac-dung-phu" },
  { label: "Bệnh Học", href: "/benh-hoc" },
  { label: "Xét nghiệm & Chỉ số", href: "/xet-nghiem-chi-so" },
  { label: "Thuật ngữ", href: "/thuat-ngu" },
  { label: "Tin khác", href: "/tin-khac" },
];

export const thuocSubcategorySlugs = thuocDropdown.map((item) => ({
  slug: item.href.replace("/thuoc/", ""),
  title: item.text,
}));

export const geneTherapySubcategorySlugs = geneTherapyDropdown.map((item) => ({
  slug: item.href.replace("/lieu-phap-gene-te-bao/", ""),
  title: item.text,
}));

export const LOGO_SRC =
  "https://iweejgtuyzdmdjdjmxiq.supabase.co/storage/v1/object/public/images/thegioithuocmoi/TGTM-Final-06-750x254.png";
