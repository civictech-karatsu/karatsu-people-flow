import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Dataset } from "../types";
import { areaColor, formatNumber, formatYm } from "../lib/data";

interface Props {
  data: Dataset;
  areaId: string;
  onClose: () => void;
}

type IntradayMode = "attr" | "weekend";

export default function AreaDetail({ data, areaId, onClose }: Props) {
  const area = data.areas.find((a) => a.id === areaId)!;
  const intradayYears = data.meta.intradayYears;
  const [year, setYear] = useState<number>(intradayYears[intradayYears.length - 1]);
  const [mode, setMode] = useState<IntradayMode>("attr");

  // 月次推移
  const monthly = useMemo(
    () =>
      data.monthly
        .filter((m) => m.areaId === areaId)
        .sort((a, b) => a.ym.localeCompare(b.ym))
        .map((m) => ({ ym: m.ym, label: formatYm(m.ym), value: m.value })),
    [data.monthly, areaId]
  );

  // 時間帯×属性 / 平日・休日
  const attrData = useMemo(
    () =>
      data.intradayAttr
        .filter((d) => d.areaId === areaId && d.year === year)
        .sort((a, b) => a.order - b.order),
    [data.intradayAttr, areaId, year]
  );

  // 時間帯×年代
  const ageData = useMemo(
    () =>
      data.intradayAge
        .filter((d) => d.areaId === areaId && d.year === year)
        .sort((a, b) => a.order - b.order),
    [data.intradayAge, areaId, year]
  );

  const color = areaColor(areaId);

  return (
    <div className="flex flex-col lg:h-full">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
          <h2 className="font-bold text-karatsu-800">{area.name}</h2>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>

      <div className="space-y-6 p-4 lg:flex-1 lg:overflow-y-auto">
        {/* 月次推移 */}
        <section>
          <h3 className="mb-1 text-sm font-semibold text-gray-700">月次 滞在人口の推移</h3>
          <p className="mb-2 text-xs text-gray-400">2019年〜（来街者ベース・月間延べ人数）</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthly} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
              <XAxis
                dataKey="ym"
                tick={{ fontSize: 10 }}
                interval={11}
                tickFormatter={(ym: string) => ym.slice(0, 4)}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                width={48}
                tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
              />
              <Tooltip
                formatter={(v: number) => [`${formatNumber(v)} 人`, "滞在人口"]}
                labelFormatter={(ym: string) => formatYm(ym)}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </section>

        {/* 時間帯プロファイル */}
        <section>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-700">時間帯プロファイル</h3>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded border border-gray-300 px-2 py-1 text-xs"
            >
              {intradayYears.map((y) => (
                <option key={y} value={y}>
                  {y}年
                </option>
              ))}
            </select>
          </div>

          <div className="mb-2 flex gap-1">
            <Seg active={mode === "attr"} onClick={() => setMode("attr")}>
              属性別(居住/勤務/来街)
            </Seg>
            <Seg active={mode === "weekend"} onClick={() => setMode("weekend")}>
              平日/休日
            </Seg>
          </div>

          {mode === "attr" ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={attrData} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                <XAxis dataKey="slot" tick={{ fontSize: 10 }} interval={5} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  width={48}
                  tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                />
                <Tooltip formatter={(v: number, n: string) => [`${formatNumber(v)} 人`, n]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line name="居住者" dataKey="resident" stroke="#2f9e6b" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
                <Line name="勤務者" dataKey="worker" stroke="#e0792a" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
                <Line name="来街者" dataKey="visitor" stroke="#1e6fb0" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <>
              <p className="mb-1 text-xs text-gray-400">※ 平日・休日は1日あたりの平均人数</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={attrData} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                  <XAxis dataKey="slot" tick={{ fontSize: 10 }} interval={5} />
                  <YAxis tick={{ fontSize: 10 }} width={40} />
                  <Tooltip formatter={(v: number, n: string) => [`${formatNumber(v)} 人`, n]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line name="平日" dataKey="weekday" stroke="#1e6fb0" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
                  <Line name="休日" dataKey="holiday" stroke="#d6455d" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </section>

        {/* 年代別 */}
        <section>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">時間帯 × 年代別（{year}年）</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={ageData} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
              <XAxis dataKey="slot" tick={{ fontSize: 10 }} interval={5} />
              <YAxis
                tick={{ fontSize: 10 }}
                width={48}
                tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
              />
              <Tooltip formatter={(v: number, n: string) => [`${formatNumber(v)} 人`, n]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line name="20代" dataKey="a20" stroke="#1e6fb0" strokeWidth={1.6} dot={false} isAnimationActive={false} connectNulls />
              <Line name="30代" dataKey="a30" stroke="#2f9e6b" strokeWidth={1.6} dot={false} isAnimationActive={false} connectNulls />
              <Line name="40代" dataKey="a40" stroke="#caa02c" strokeWidth={1.6} dot={false} isAnimationActive={false} connectNulls />
              <Line name="50代" dataKey="a50" stroke="#e0792a" strokeWidth={1.6} dot={false} isAnimationActive={false} connectNulls />
              <Line name="60代" dataKey="a60" stroke="#d6455d" strokeWidth={1.6} dot={false} isAnimationActive={false} connectNulls />
              <Line name="70歳以上" dataKey="a70" stroke="#9b59b6" strokeWidth={1.6} dot={false} isAnimationActive={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </section>
      </div>
    </div>
  );
}

function Seg({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded border px-2 py-1 text-xs transition ${
        active
          ? "border-karatsu-600 bg-karatsu-600 text-white"
          : "border-gray-300 bg-white text-gray-600 hover:border-karatsu-300"
      }`}
    >
      {children}
    </button>
  );
}
