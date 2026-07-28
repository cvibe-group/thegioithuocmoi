import type { GlossaryPageData, GlossarySection } from "@/types/content";

const alphabet = ["All", "A", "B", "C", "D", "Đ", "E", "G", "H", "I", "K", "L", "M", "N", "P", "Q", "R", "S", "T", "U", "Ù", "Ứ", "V", "X"] as const;

export const glossaryAlphabet = alphabet;

const benhHocSections: GlossarySection[] = [
  {
    letter: "A",
    items: [
      { text: "Alkapton niệu", href: "#" },
      { text: "Alpha thalassemia", href: "#" },
    ],
  },
  {
    letter: "B",
    items: [
      { text: "Bạch biến", href: "#" },
      { text: "Bệnh Addison", href: "#" },
      { text: "Bệnh bạch cầu cấp", href: "#" },
      { text: "Bệnh bạch cầu lympho cấp", href: "#" },
      { text: "Bệnh bạch cầu mạn", href: "#" },
      { text: "Bệnh bạch cầu mạn dòng tủy", href: "#" },
      { text: "Bệnh bạch cầu mạn dòng lympho", href: "#" },
      { text: "Bệnh bạch cầu tủy cấp", href: "#" },
      { text: "Bệnh Basedow", href: "#" },
      { text: "Bệnh Behçet", href: "#" },
      { text: "Bệnh bong bóng da", href: "#" },
      { text: "Bệnh Crohn", href: "#" },
      { text: "Bệnh đậu mùa tự nhiên", href: "#" },
      { text: "Bệnh động mạch vành", href: "#" },
      { text: "Bệnh ngủ Châu Phi", href: "#" },
      { text: "Bệnh ngưng kết lạnh", href: "#" },
      { text: "Bệnh phổi mô kẽ", href: "#" },
    ],
  },
  {
    letter: "C",
    items: [
      { text: "Cao huyết áp", href: "#" },
      { text: "Cao oxalate niệu nguyên phát type 1", href: "#" },
      { text: "Chứng giảm ham muốn tình dục", href: "#" },
      { text: "Chứng quá động kém tập trung", href: "#" },
      { text: "Cơn thiếu máu não thoáng qua", href: "#" },
    ],
  },
];

const xetNghiemSections: GlossarySection[] = [
  {
    letter: "A",
    items: [
      { text: "Amylase", href: "#" },
      { text: "Aspartate aminotransferase", href: "#" },
      { text: "Axit uric", href: "#" },
    ],
  },
  {
    letter: "B",
    items: [
      { text: "Bạch cầu ái kiềm", href: "#" },
      { text: "Bạch cầu ái toan", href: "#" },
      { text: "Bạch cầu hạt", href: "#" },
      { text: "Bilirubin gián tiếp", href: "#" },
      { text: "Bilirubin không liên hợp", href: "#" },
    ],
  },
  {
    letter: "C",
    items: [
      { text: "CA-125", href: "#" },
      { text: "Cancer antigen 15-3", href: "#" },
      { text: "Carbohydrate antigen 19-9", href: "#" },
      { text: "CEA", href: "#" },
      { text: "CGP test", href: "#" },
      { text: "Cholesterol lipoprotein mật độ cao", href: "#" },
      { text: "Chụp cắt lớp phát xạ positron", href: "#" },
      { text: "Chụp cộng hưởng từ", href: "#" },
      { text: "Clo", href: "#" },
      { text: "ctDNA", href: "#" },
    ],
  },
];

const thuatNguSections: GlossarySection[] = [
  {
    letter: "A",
    items: [
      { text: "Alpha thụ thể interleukin 5", href: "#" },
      { text: "Anaplastic Lymphoma Kinase", href: "#" },
      { text: "Apheresis", href: "#" },
    ],
  },
  {
    letter: "B",
    items: [
      { text: "BRCA1", href: "#" },
      { text: "Bệnh còn sót lại tối thiểu", href: "#" },
      { text: "Buồn ngủ ban ngày quá mức", href: "#" },
    ],
  },
  {
    letter: "C",
    items: [
      { text: "Capsid", href: "#" },
      { text: "CD22", href: "#" },
      { text: "Chimeric", href: "#" },
      { text: "Chất ức chế phân bào", href: "#" },
      { text: "Chất chủ vận thụ thể adrenergic beta 3", href: "#" },
      { text: "Chất chủ vận thụ thể glucagon", href: "#" },
    ],
  },
  {
    letter: "G",
    items: [
      { text: "Germ cell", href: "#" },
      { text: "Ghép tế bào gốc đồng loại", href: "#" },
      { text: "Glucagon", href: "#" },
      { text: "Granulocyte-colony stimulating factor", href: "#" },
    ],
  },
  {
    letter: "L",
    items: [
      { text: "Liệu pháp gene", href: "#" },
    ],
  },
];

export function getGlossaryPage(tab: GlossaryPageData["activeTab"]): GlossaryPageData {
  const sections =
    tab === "benh-hoc"
      ? benhHocSections
      : tab === "xet-nghiem-chi-so"
        ? xetNghiemSections
        : thuatNguSections;

  return { activeTab: tab, sections };
}

export const glossaryTabs = [
  { id: "benh-hoc" as const, label: "Bệnh học", href: "/benh-hoc" },
  { id: "xet-nghiem-chi-so" as const, label: "Xét nghiệm & Chỉ số", href: "/xet-nghiem-chi-so" },
  { id: "thuat-ngu" as const, label: "Thuật ngữ", href: "/thuat-ngu" },
];
