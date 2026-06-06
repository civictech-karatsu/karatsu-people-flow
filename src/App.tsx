import { useEffect, useMemo, useRef, useState } from "react";
import type { Dataset } from "./types";
import {
  areaColor,
  buildMonthlyLookup,
  formatNumber,
  formatYm,
  formatYoy,
  loadDataset,
} from "./lib/data";
import FlowMap, { type Metric } from "./components/FlowMap";
import AreaDetail from "./components/AreaDetail";

export default function App() {
  const [data, setData] = useState<Dataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [monthIdx, setMonthIdx] = useState(0);
  const [metric, setMetric] = useState<Metric>("value");
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    loadDataset()
      .then((d) => {
        setData(d);
        setMonthIdx(d.meta.months.length - 1); // 最新月から
      })
      .catch((e) => setError(e.message));
  }, []);

  const lookup = useMemo(() => (data ? buildMonthlyLookup(data.monthly) : new Map()), [data]);
  const maxValue = useMemo(
    () => (data ? Math.max(...data.monthly.map((m) => m.value)) : 1),
    [data]
  );

  // アニメーション再生
  useEffect(() => {
    if (!playing || !data) return;
    timer.current = window.setInterval(() => {
      setMonthIdx((i) => {
        if (i >= data.meta.months.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 450);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [playing, data]);

  const currentYm = data?.meta.months[monthIdx] ?? "";

  const areaData = useMemo(() => {
    if (!data) return [];
    return data.areas.map((area) => {
      const p = lookup.get(`${area.id}|${currentYm}`);
      return { area, value: p?.value ?? null, yoy: p?.yoy ?? null };
    });
  }, [data, lookup, currentYm]);

  const restriction = useMemo(
    () => data?.restrictions.find((r) => r.ym === currentYm)?.label ?? null,
    [data, currentYm]
  );

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center p-6 text-center text-red-700">
        <div>
          <p className="text-lg font-bold">データを読み込めませんでした</p>
          <p className="mt-2 text-sm">{error}</p>
          <p className="mt-4 text-xs text-gray-500">
            <code>npm run data</code> で public/data.json を生成してください。
          </p>
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex h-screen items-center justify-center text-karatsu-700">
        <p className="animate-pulse text-sm">データを読み込み中…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* ヘッダ */}
      <header className="z-10 bg-karatsu-800 px-4 py-3 text-white">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-lg font-bold tracking-wide lg:text-xl">唐津市 エリア別人流マップ</h1>
          <span className="text-xs text-karatsu-100/80">滞在人口（来街者・月間延べ）</span>
        </div>
      </header>

      {/* コントロールバー */}
      <div className="z-10 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* 月スライダー */}
          <div className="flex flex-1 items-center gap-3">
            <button
              onClick={() => setPlaying((p) => !p)}
              className="shrink-0 rounded-full bg-karatsu-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-karatsu-700"
            >
              {playing ? "⏸ 停止" : "▶ 再生"}
            </button>
            <div className="min-w-0 flex-1">
              <input
                type="range"
                min={0}
                max={data.meta.months.length - 1}
                value={monthIdx}
                onChange={(e) => {
                  setMonthIdx(Number(e.target.value));
                  setPlaying(false);
                }}
                className="w-full accent-karatsu-600"
              />
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>{formatYm(data.meta.months[0])}</span>
                <span>{formatYm(data.meta.months[data.meta.months.length - 1])}</span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="tabular text-base font-bold text-karatsu-800">
                {formatYm(currentYm)}
              </div>
              {restriction && (
                <div className="rounded bg-amber-100 px-1.5 text-[11px] font-medium text-amber-700">
                  {restriction}
                </div>
              )}
            </div>
          </div>

          {/* 指標切替 */}
          <div className="flex shrink-0 gap-1">
            <MetricBtn active={metric === "value"} onClick={() => setMetric("value")}>
              滞在人口
            </MetricBtn>
            <MetricBtn active={metric === "yoy"} onClick={() => setMetric("yoy")}>
              前年同月比
            </MetricBtn>
          </div>
        </div>
      </div>

      {/* 本体: 地図 + 詳細 */}
      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="relative min-h-0 flex-1">
          <FlowMap
            data={areaData}
            maxValue={maxValue}
            metric={metric}
            selectedAreaId={selectedAreaId}
            onSelect={setSelectedAreaId}
          />
          <Legend metric={metric} areaData={areaData} />
        </div>

        {selectedAreaId ? (
          <aside className="h-[55vh] shrink-0 border-t border-gray-200 bg-white lg:h-auto lg:w-[420px] lg:border-l lg:border-t-0">
            <AreaDetail data={data} areaId={selectedAreaId} onClose={() => setSelectedAreaId(null)} />
          </aside>
        ) : (
          <aside className="hidden w-[420px] shrink-0 border-l border-gray-200 bg-white p-6 lg:block">
            <RankPanel areaData={areaData} ym={currentYm} onSelect={setSelectedAreaId} />
          </aside>
        )}
      </div>

      {/* フッタ */}
      <footer className="z-10 border-t border-gray-200 bg-white px-4 py-2 text-[11px] text-gray-500">
        出典:{" "}
        <a href={data.meta.sourceUrl} target="_blank" rel="noreferrer" className="text-karatsu-600 underline">
          {data.meta.source}
        </a>
        {" / "}
        {data.meta.note}
        {" / 地図: 国土地理院 / 非公式の可視化"}
      </footer>
    </div>
  );
}

function MetricBtn({
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
      className={`rounded border px-3 py-1.5 text-sm transition ${
        active
          ? "border-karatsu-600 bg-karatsu-600 text-white"
          : "border-gray-300 bg-white text-gray-600 hover:border-karatsu-300"
      }`}
    >
      {children}
    </button>
  );
}

function Legend({
  metric,
  areaData,
}: {
  metric: Metric;
  areaData: { area: { id: string; name: string }; value: number | null }[];
}) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] rounded-lg bg-white/90 p-3 text-xs shadow-md">
      <div className="mb-1 font-semibold text-gray-700">
        円の大きさ＝滞在人口
        {metric === "yoy" && " / 色＝前年同月比"}
      </div>
      {metric === "yoy" ? (
        <div className="flex items-center gap-1">
          <Swatch c="#1d4ed8" label="減" />
          <Swatch c="#3b82c4" label="" />
          <Swatch c="#9ca3af" label="横ばい" />
          <Swatch c="#e67e22" label="" />
          <Swatch c="#c0392b" label="増" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {areaData.map(({ area }) => (
            <div key={area.id} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: areaColor(area.id) }} />
              <span className="text-gray-600">{area.name.replace(/エリア$/, "")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Swatch({ c, label }: { c: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="inline-block h-3 w-5" style={{ backgroundColor: c }} />
      {label && <span className="text-[10px] text-gray-500">{label}</span>}
    </div>
  );
}

// 詳細未選択時のサイドパネル: 当月ランキング
function RankPanel({
  areaData,
  ym,
  onSelect,
}: {
  areaData: { area: { id: string; name: string }; value: number | null; yoy: number | null }[];
  ym: string;
  onSelect: (id: string) => void;
}) {
  const ranked = [...areaData].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  return (
    <div>
      <h2 className="mb-1 font-bold text-karatsu-800">{formatYm(ym)} のエリア別滞在人口</h2>
      <p className="mb-3 text-xs text-gray-400">エリアをクリックすると詳細（時間帯・年代など）を表示します。</p>
      <ul className="space-y-1.5">
        {ranked.map(({ area, value, yoy }, i) => (
          <li key={area.id}>
            <button
              onClick={() => onSelect(area.id)}
              className="flex w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-left hover:border-karatsu-400 hover:bg-karatsu-50"
            >
              <span className="w-4 text-sm font-bold text-gray-400">{i + 1}</span>
              <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: areaColor(area.id) }} />
              <span className="min-w-0 flex-1 truncate text-sm">{area.name}</span>
              <span className="tabular text-sm font-semibold text-gray-800">{formatNumber(value)}</span>
              <span
                className={`tabular w-12 text-right text-xs ${
                  yoy === null ? "text-gray-300" : yoy >= 1 ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {formatYoy(yoy)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
