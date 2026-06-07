import { useMemo, useState } from "react";
import L from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { Area } from "../types";
import { areaColor, formatNumber, formatYoy, radiusFor, yoyColor } from "../lib/data";

export type Metric = "value" | "yoy";

interface AreaDatum {
  area: Area;
  value: number | null;
  yoy: number | null;
}

interface Props {
  data: AreaDatum[];
  maxValue: number;
  metric: Metric;
  selectedAreaId: string | null;
  onSelect: (id: string) => void;
}

// 近接マーカーの表示位置(ズーム依存で重なりを解消)
interface Placed {
  lat: number;
  lng: number;
  displaced: boolean;
}

// 現在ズームでピクセル距離が近いエリアをグルーピングし、
// グループ重心の周りに扇状(リング)に展開して重なりを解消する。
// ズームインしてピクセル距離が離れれば自動的に真の位置へ戻る。
function declutter(map: L.Map, areas: Area[], zoom: number): Record<string, Placed> {
  const T = 26; // これ未満(px)なら重なりとみなす
  const pts = areas.map((a) => ({ a, p: map.project([a.lat, a.lng], zoom) }));
  const n = pts.length;
  const parent = pts.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = pts[i].p.distanceTo(pts[j].p);
      if (d < T) parent[find(i)] = find(j);
    }
  }
  const groups = new Map<number, number[]>();
  pts.forEach((_, i) => {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r)!.push(i);
  });

  const out: Record<string, Placed> = {};
  for (const idxs of groups.values()) {
    if (idxs.length < 2) {
      const a = pts[idxs[0]].a;
      out[a.id] = { lat: a.lat, lng: a.lng, displaced: false };
      continue;
    }
    const cx = idxs.reduce((s, i) => s + pts[i].p.x, 0) / idxs.length;
    const cy = idxs.reduce((s, i) => s + pts[i].p.y, 0) / idxs.length;
    const ring = 30 + idxs.length * 6;
    const sorted = [...idxs].sort((a, b) => (pts[a].a.id < pts[b].a.id ? -1 : 1));
    sorted.forEach((i, k) => {
      const ang = (k / sorted.length) * 2 * Math.PI - Math.PI / 2;
      const ll = map.unproject(L.point(cx + ring * Math.cos(ang), cy + ring * Math.sin(ang)), zoom);
      out[pts[i].a.id] = { lat: ll.lat, lng: ll.lng, displaced: true };
    });
  }
  return out;
}

function AreaMarkers({ data, maxValue, metric, selectedAreaId, onSelect }: Props) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  const areas = useMemo(() => data.map((d) => d.area), [data]);
  const placed = useMemo(() => declutter(map, areas, zoom), [map, areas, zoom]);

  // 大きい円から先に描画し、小さい円を上に(クリック可能に)
  const ordered = useMemo(
    () => [...data].sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
    [data]
  );

  return (
    <>
      {/* リーダー線(展開したマーカー → 真の位置) */}
      {ordered.map(({ area }) => {
        const pos = placed[area.id];
        if (!pos?.displaced) return null;
        return (
          <Polyline
            key={`lead-${area.id}`}
            positions={[
              [pos.lat, pos.lng],
              [area.lat, area.lng],
            ]}
            pathOptions={{ color: "#94a3b8", weight: 1, dashArray: "3 3", interactive: false }}
          />
        );
      })}
      {ordered.map(({ area, value, yoy }) => {
        const pos = placed[area.id] ?? { lat: area.lat, lng: area.lng, displaced: false };
        const v = value ?? 0;
        const fill = metric === "yoy" ? yoyColor(yoy) : areaColor(area.id);
        const selected = selectedAreaId === area.id;
        return (
          <CircleMarker
            key={area.id}
            center={[pos.lat, pos.lng]}
            radius={radiusFor(v, maxValue, 40)}
            pathOptions={{
              color: selected ? "#0f3a59" : "#ffffff",
              weight: selected ? 3 : 1.5,
              fillColor: fill,
              fillOpacity: 0.72,
            }}
            eventHandlers={{ click: () => onSelect(area.id) }}
          >
            <Tooltip direction="top" offset={[0, -4]} opacity={1}>
              <div className="text-xs">
                <div className="font-bold">{area.name}</div>
                <div>滞在人口: {formatNumber(value)} 人</div>
                <div>前年同月比: {formatYoy(yoy)}</div>
                <div className="mt-0.5 text-gray-400">クリックで詳細</div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}

export default function FlowMap(props: Props) {
  return (
    <MapContainer
      center={[33.492, 129.952]}
      zoom={11}
      scrollWheelZoom
      className="h-full w-full"
      style={{ minHeight: "420px" }}
    >
      {/* 国土地理院 淡色地図タイル(オープン・キー不要) */}
      <TileLayer
        url="https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>'
        maxZoom={18}
      />
      <AreaMarkers {...props} />
    </MapContainer>
  );
}
