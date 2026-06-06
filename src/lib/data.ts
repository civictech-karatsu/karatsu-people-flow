import type { Dataset, MonthlyPoint } from "../types";

export async function loadDataset(): Promise<Dataset> {
  const res = await fetch(`${import.meta.env.BASE_URL}data.json`);
  if (!res.ok) throw new Error(`データの読み込みに失敗しました (HTTP ${res.status})`);
  return (await res.json()) as Dataset;
}

// "indicatorId|ym" → MonthlyPoint
export function buildMonthlyLookup(monthly: MonthlyPoint[]): Map<string, MonthlyPoint> {
  const m = new Map<string, MonthlyPoint>();
  for (const p of monthly) m.set(`${p.areaId}|${p.ym}`, p);
  return m;
}

const NUM_FMT = new Intl.NumberFormat("ja-JP");

export function formatNumber(v: number | null | undefined): string {
  if (v === null || v === undefined) return "–";
  return NUM_FMT.format(Math.round(v));
}

// "2019-01" → "2019年1月"
export function formatYm(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}年${Number(m)}月`;
}

// 前年同月比(1.05)→ "+5%"
export function formatYoy(yoy: number | null): string {
  if (yoy === null || yoy === undefined) return "–";
  const pct = (yoy - 1) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
}

// エリアごとの識別色
export const AREA_COLORS: Record<string, string> = {
  "karatsu-st": "#1e6fb0",
  "chuo-shoten": "#e0792a",
  kitagawa: "#2f9e6b",
  "hamasaki-st": "#d6455d",
  yobuko: "#9b59b6",
  chinzei: "#caa02c",
};

export function areaColor(id: string): string {
  return AREA_COLORS[id] ?? "#64748b";
}

// 滞在人口 → 円の半径(px)。面積が値に比例するよう sqrt スケール。
export function radiusFor(value: number, maxValue: number, maxRadius = 46, minRadius = 8): number {
  if (!maxValue || value <= 0) return minRadius;
  const r = Math.sqrt(value / maxValue) * maxRadius;
  return Math.max(minRadius, r);
}

// 前年同月比 → 色(減少=青, 増加=赤, 横ばい=灰)
export function yoyColor(yoy: number | null): string {
  if (yoy === null || yoy === undefined) return "#9ca3af";
  const pct = (yoy - 1) * 100;
  if (pct >= 15) return "#c0392b";
  if (pct >= 5) return "#e67e22";
  if (pct > -5) return "#9ca3af";
  if (pct > -15) return "#3b82c4";
  return "#1d4ed8";
}
