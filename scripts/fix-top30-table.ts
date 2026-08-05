/**
 * One-off: convert Top 30 ranking list into an HTML table.
 *   npx tsx scripts/fix-top30-table.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { htmlToBlocks } from "../src/lib/content/html-to-blocks";
import { sanitizeArticleHtml } from "../src/lib/content/html-sanitize";

config({ path: resolve(process.cwd(), ".env.local") });

const ARTICLE_PATH =
  "/2026/07/30/top-30-cong-ty-duoc-hang-dau-the-gioi-nam-2026";

const intro = `<p>Bảng xếp hạng được đánh giá dựa trên báo cáo chuyên sâu Pharm Exec Top 50 của tạp chí Pharmaceutical Executive, tập trung vào doanh thu từ mảng thuốc kê đơn (Rx sales) toàn cầu.</p><p>Đứng đầu bảng xếp hạng tiếp tục là tập đoàn dược phẩm Johnson &amp; Johnson (Hoa Kỳ) với doanh thu thuốc kê đơn đạt 55,745 tỷ USD, nhờ vào các trụ cột chính trong lĩnh vực miễn dịch và ung thư như Darzalex, Stelara và Tremfya.</p><p>Vị trí thứ 2 thuộc về AbbVie (Hoa Kỳ) đạt 54,484 tỷ USD, ghi nhận sự chuyển giao thành công khi hai sản phẩm thế hệ mới Skyrizi và Rinvoq tăng trưởng bứt phá để bù đắp cho sự sụt giảm của Humira.</p><p>Đứng thứ 3 là Merck &amp; Co. (Hoa Kỳ) đạt 54,314 tỷ USD, tiếp tục được nâng đỡ bởi "bom tấn" ung thư Keytruda – sản phẩm bán chạy nhất hành tinh. Điểm sáng nổi bật trong bảng xếp hạng năm nay là sự thăng tiến vượt bậc của các tập đoàn sở hữu dòng thuốc GLP-1 điều trị đái tháo đường và béo phì như Novo Nordisk (xếp thứ 10) và Eli Lilly (xếp thứ 11).</p><h2>Bảng tổng hợp Top 30 công ty dược thế giới</h2>`;

const rows: Array<[string, string, string, string]> = [
  ["1", "Johnson &amp; Johnson<br />(New Jersey, USA)", "55,745", "Darzalex, Stelara, Tremfya"],
  ["2", "AbbVie<br />(Illinois, USA)", "54,484", "Skyrizi, Humira, Rinvoq"],
  ["3", "Merck &amp; Co.<br />(New Jersey, USA)", "54,314", "Keytruda, Gardasil 9, Bridion"],
  ["4", "Roche<br />(Basel, SWITZERLAND)", "52,457", "Ocrevus, Hemlibra, Vabysmo"],
  ["5", "Pfizer<br />(New York, USA)", "51,953", "Prevnar 13, Paxlovid, Vyndaqel"],
  ["6", "AstraZeneca<br />(London, ENGLAND)", "50,946", "Farxiga, Tagrisso, Imfinzi"],
  ["7", "Novartis<br />(Basel, SWITZERLAND)", "50,191", "Entresto, Cosentyx, Kesimpta"],
  ["8", "Bristol Myers Squibb<br />(New York, USA)", "47,821", "Eliquis, Opdivo, Revlimid"],
  ["9", "Sanofi<br />(Paris, FRANCE)", "44,243", "Dupixent, Fluzone, Pentacel"],
  ["10", "Novo Nordisk<br />(Bagsvaerd, DENMARK)", "42,122", "Ozempic, Wegovy, Rybelsus"],
  ["11", "Eli Lilly<br />(Indiana, USA)", "40,716", "Mounjaro, Zepbound, Verzenio"],
  ["12", "GlaxoSmithKline<br />(Brentford, ENGLAND)", "39,718", "Shingrix, Trelegy, Dovato"],
  ["13", "Amgen<br />(California, USA)", "31,748", "Prolia, Enbrel, Xgeva"],
  ["14", "Takeda<br />(Osaka, JAPAN)", "29,782", "Entyvio, Gammagard Liquid, Vyvanse"],
  ["15", "Gilead Sciences<br />(California, USA)", "28,028", "Biktarvy, Descovy, Veklury"],
  ["16", "Boehringer Ingelheim<br />(Ingelheim, GERMANY)", "22,175", "Jardiance, Ofev, Tradjenta"],
  ["17", "Bayer<br />(Leverkusen, GERMANY)", "17,710", "Eylea, Xarelto, Nubeqa"],
  ["18", "CSL<br />(Melbourne, AUSTRALIA)", "15,009", "Privigen, Hizentra, Human albumin"],
  ["19", "Viatris<br />(Pennsylvania, USA)", "14,534", "Lipitor, Norvasc, Advair Diskus"],
  ["20", "Teva<br />(Petach Tikva, ISRAEL)", "13,495", "Austedo, Ajovy, Copaxone"],
  ["21", "Astellas<br />(Tokyo, JAPAN)", "11,816", "Xtandi, Myrbetriq, Prograf"],
  ["22", "Vertex<br />(Massachusetts, USA)", "11,020", "Trikafta, Kalydeco, Orkambi"],
  ["23", "Daiichi Sankyo<br />(Tokyo, JAPAN)", "10,912", "Enhertu, Lixiana, Venofer"],
  ["24", "Sandoz Group<br />(Basel, SWITZERLAND)", "10,357", "Hyrimoz, Omnitrope, Rixathon"],
  ["25", "Merck KGaA<br />(Darmstadt, GERMANY)", "9,148", "Erbitux, Mavenclad, Glucophage"],
  ["26", "Otsuka Holdings<br />(Tokyo, JAPAN)", "8,975", "Rexulti, Jynarque, Abilify Maintena"],
  ["27", "Regeneron<br />(New York, USA)", "7,629", "Eylea, Libtayo, Eylea HD"],
  ["28", "Biogen<br />(Massachusetts, USA)", "7,214", "Tysabri, Spinraza, Tecfidera"],
  ["29", "Grifols<br />(Barcelona, SPAIN)", "6,646", "Gamunex-C, Flebogamma, Prolastin-C"],
  ["30", "Organon<br />(New Jersey, USA)", "6,219", "Nexplanon, Liptruzet, Singulair"],
];

async function main() {
  const tableRows = rows
    .map(
      ([tt, name, revenue, drugs]) =>
        `<tr><td>${tt}</td><td>${name}</td><td>${revenue}</td><td>${drugs}</td></tr>`,
    )
    .join("");

  const table = `<figure class="table"><table><thead><tr><th>TT</th><th>Tên công ty</th><th>Doanh thu (Tỷ USD)</th><th>Thuốc chủ lực</th></tr></thead><tbody>${tableRows}</tbody></table></figure>`;

  const footer = `<p>Nguồn tham khảo:<br />1. EvaluatePharma®, Evaluate Ltd.<br />2. Pharmaceutical Executive – Pharm Exec Top 50 Report (https://www.pharmexec.com)</p>`;

  const html = sanitizeArticleHtml(intro + table + footer);
  const blocks = htmlToBlocks(html, { includeImages: true });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const supabase = createClient(url, key);
  const { error } = await supabase
    .from("articles")
    .update({
      content_html: html,
      blocks,
      updated_at: new Date().toISOString(),
    })
    .eq("path", ARTICLE_PATH);

  if (error) throw new Error(error.message);
  console.log(
    "OK",
    ARTICLE_PATH,
    "len",
    html.length,
    "table",
    html.includes("<table>"),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
