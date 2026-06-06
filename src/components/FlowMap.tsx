import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
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

export default function FlowMap({ data, maxValue, metric, selectedAreaId, onSelect }: Props) {
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
      {data.map(({ area, value, yoy }) => {
        const v = value ?? 0;
        const fill = metric === "yoy" ? yoyColor(yoy) : areaColor(area.id);
        const selected = selectedAreaId === area.id;
        return (
          <CircleMarker
            key={area.id}
            center={[area.lat, area.lng]}
            radius={radiusFor(v, maxValue)}
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
    </MapContainer>
  );
}
