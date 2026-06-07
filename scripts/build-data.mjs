// 唐津市 エリア別人流(滞在人口)データ ビルドスクリプト
//
// 唐津市公開の3つのExcelを解析し、アプリが読み込む public/data.json に整形する。
//   - 23626.xlsx 「毎月更新(入力用)」: 月次滞在人口 2019年〜最新 / 6エリア / 前年同月比 / 制限状況
//   - 22720.xlsx 半期レポート: 時間帯別(30分) × 居住者/勤務者/来街者 / 平日・休日 (2020・2021年)
//   - 22721.xlsx 半期レポート: 時間帯別(30分) × 年代別 (2020・2021年)
//
// 出典: 唐津市 (KDDI Location Analyzer)。各エリア15分以上滞在者の月間延べ人数。
//
import XLSX from "xlsx";
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const RAW = join(ROOT, "raw-data");

const SOURCE_URL = "https://www.city.karatsu.lg.jp/page/1039.html";

// 6エリアの定義。座標は各エリアの代表地点を実測値で配置。
// 出典: 駅・名所=OpenStreetMap(Nominatim) / 町丁=国土地理院ジオコーダ。
//   - karatsu-st  : 唐津駅
//   - chuo-shoten : 京町(中央商店街アーケード)
//   - kitagawa    : 東城内(唐津城・中心市街地北側)
//   - hamasaki-st : 浜崎駅
//   - yobuko      : 呼子朝市通り
//   - chinzei     : 名護屋城跡〜波戸岬の中間
const AREAS = [
  { id: "karatsu-st", name: "唐津駅周辺", lat: 33.4463, lng: 129.9678 },
  { id: "chuo-shoten", name: "中央商店街エリア", lat: 33.447, lng: 129.9698 },
  { id: "kitagawa", name: "中心市街地北側エリア", lat: 33.4528, lng: 129.977 },
  { id: "hamasaki-st", name: "浜崎駅周辺エリア", lat: 33.4468, lng: 130.0365 },
  { id: "yobuko", name: "呼子朝市エリア", lat: 33.537, lng: 129.8951 },
  { id: "chinzei", name: "鎮西町名護屋・波戸エリア", lat: 33.5412, lng: 129.8613 },
];

function num(v) {
  if (v === "" || v === null || v === undefined || v === "-") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function readSheet(file, sheetName) {
  const wb = XLSX.readFile(join(RAW, file));
  const name = sheetName ?? wb.SheetNames[0];
  const ws = wb.Sheets[name];
  return XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: "" });
}

function sheetNames(file) {
  return XLSX.readFile(join(RAW, file)).SheetNames;
}

// "5時"〜"28時半" の時間帯ラベルを 0始まりの並び順インデックスに。
// 24時=0:00, 28時=翌4:00 として深夜も連続表示する。
function slotOrder(label) {
  const m = String(label).match(/^(\d+)時(半)?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const half = m[2] ? 1 : 0;
  return h * 2 + half; // 5時=10, 28時半=57
}

// ---- 1) 月次滞在人口 (23626) ----
function parseMonthly() {
  const rows = readSheet("23626.xlsx");
  // 列: 0=年月, area i → 滞在人口=1+2i, 前年同月比=2+2i, 制限状況=13
  const monthly = [];
  const restrictions = [];
  for (const row of rows) {
    const ymRaw = String(row[0] ?? "").trim();
    const m = ymRaw.match(/^(\d{4})年(\d{1,2})月$/);
    if (!m) continue;
    const ym = `${m[1]}-${String(m[2]).padStart(2, "0")}`;
    AREAS.forEach((area, i) => {
      const value = num(row[1 + 2 * i]);
      const yoy = num(row[2 + 2 * i]);
      if (value !== null) monthly.push({ areaId: area.id, ym, value, yoy });
    });
    const restriction = String(row[13] ?? "").trim();
    if (restriction) restrictions.push({ ym, label: restriction });
  }
  return { monthly, restrictions };
}

// ---- 2) 時間帯×属性 (22720) と 時間帯×年代 (22721) ----
// 各ファイルは「2020年ブロック」(左)と「2021年ブロック」(右)が横並び。
// シートによって右ブロックの開始列がズレる(浜崎駅など)ため、ヘッダ行から
// 年マーカー(例: "2020年" "2021年")の列位置を動的に検出する。
function parseIntraday(file, keys) {
  const names = sheetNames(file);
  const out = [];
  names.forEach((sheet, areaIdx) => {
    const area = AREAS[areaIdx];
    if (!area) return;
    const rows = readSheet(file, sheet);
    // ヘッダ行(年マーカーを2つ以上含む行)を探し、各年ブロックのslot列を特定
    let blocks = null; // [{year, slotCol}]
    for (const row of rows) {
      const found = [];
      row.forEach((c, idx) => {
        const m = String(c).match(/(20\d{2})年/);
        if (m) found.push({ year: Number(m[1]), slotCol: idx });
      });
      if (found.length >= 2) {
        blocks = found;
        break;
      }
    }
    if (!blocks) return;

    for (const row of rows) {
      for (const { year, slotCol } of blocks) {
        const ord = slotOrder(row[slotCol]);
        if (ord === null) continue;
        const rec = { areaId: area.id, year, slot: String(row[slotCol]).trim(), order: ord };
        keys.forEach((k, j) => (rec[k] = num(row[slotCol + 1 + j])));
        out.push(rec);
      }
    }
  });
  return out;
}

async function main() {
  console.log("Excelを解析します...");

  const { monthly, restrictions } = parseMonthly();

  // 22720: slot列の右に 居住者/勤務者/来街者/平日/休日
  const intradayAttr = parseIntraday("22720.xlsx", [
    "resident",
    "worker",
    "visitor",
    "weekday",
    "holiday",
  ]);

  // 22721: slot列の右に 20代/30代/40代/50代/60代/70歳以上
  const intradayAge = parseIntraday("22721.xlsx", ["a20", "a30", "a40", "a50", "a60", "a70"]);

  const months = [...new Set(monthly.map((d) => d.ym))].sort();
  const years = [...new Set(months.map((m) => Number(m.slice(0, 4))))];
  const intradayYears = [
    ...new Set([...intradayAttr, ...intradayAge].map((d) => d.year)),
  ].sort();

  const out = {
    meta: {
      title: "唐津市 エリア別人流マップ",
      source: "唐津市 / KDDI Location Analyzer",
      sourceUrl: SOURCE_URL,
      note: "各エリアに15分以上滞在した人の月間延べ人数(来街者ベース)。auスマートフォン利用者から個人を特定しない形で集計。",
      builtAt: new Date().toISOString(),
      months,
      years,
      intradayYears,
    },
    areas: AREAS,
    monthly,
    restrictions,
    intradayAttr,
    intradayAge,
  };

  await mkdir(join(ROOT, "public"), { recursive: true });
  await writeFile(join(ROOT, "public", "data.json"), JSON.stringify(out), "utf-8");

  console.log("\n=== 完了 ===");
  console.log(`エリア: ${AREAS.length}`);
  console.log(`月次データ点: ${monthly.length} (${months[0]}〜${months[months.length - 1]})`);
  console.log(`規制状況: ${restrictions.length} ヶ月`);
  console.log(`時間帯×属性: ${intradayAttr.length} 点`);
  console.log(`時間帯×年代: ${intradayAge.length} 点`);
  console.log("→ public/data.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
