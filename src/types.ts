export interface Area {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface MonthlyPoint {
  areaId: string;
  ym: string; // "2019-01"
  value: number; // 滞在人口
  yoy: number | null; // 前年同月比 (1.0 = 同水準)
}

export interface Restriction {
  ym: string;
  label: string; // 緊急事態宣言 / 時短要請 など
}

export interface IntradayAttr {
  areaId: string;
  year: number;
  slot: string; // "12時"
  order: number;
  resident: number | null; // 居住者
  worker: number | null; // 勤務者
  visitor: number | null; // 来街者
  weekday: number | null; // 平日(1日平均)
  holiday: number | null; // 休日(1日平均)
}

export interface IntradayAge {
  areaId: string;
  year: number;
  slot: string;
  order: number;
  a20: number | null;
  a30: number | null;
  a40: number | null;
  a50: number | null;
  a60: number | null;
  a70: number | null;
}

export interface Dataset {
  meta: {
    title: string;
    source: string;
    sourceUrl: string;
    note: string;
    builtAt: string;
    months: string[];
    years: number[];
    intradayYears: number[];
  };
  areas: Area[];
  monthly: MonthlyPoint[];
  restrictions: Restriction[];
  intradayAttr: IntradayAttr[];
  intradayAge: IntradayAge[];
}
