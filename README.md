# 唐津市 エリア別人流マップ

🌐 **公開URL: https://civictech-karatsu.org/people-flow/**

唐津市が公開している**エリア別人流（滞在人口）データ**を、オープンソースの地図（国土地理院タイル）上に可視化し、月次推移・時間帯・属性・年代など多次元で見られる civic tech プロジェクトです。

元データは複数のExcelに分かれていて読み取りづらいため、構造化データに変換し、地図とグラフで直感的に把握できるようにしています。

## 特徴

- **地図可視化**: 6エリアを円の大きさ（＝滞在人口）で表示。国土地理院 淡色地図タイルを使用
- **月次タイムスライダー**: 2019年〜最新まで月単位でスクラブ／自動再生。新型コロナの規制状況（緊急事態宣言・時短要請）も表示
- **指標切替**: 滞在人口（実数）／前年同月比（色分け）
- **エリア詳細**（円をクリック）:
  - 月次 滞在人口の推移
  - 時間帯プロファイル（30分刻み）× **居住者／勤務者／来街者**、**平日／休日**
  - 時間帯 × **年代別**（20代〜70歳以上）
  - 対象年を 2020〜2024 で切替
- 完全な静的サイト（サーバ不要）

## データ

- 出典: 唐津市 / KDDI Location Analyzer（[元ページ](https://www.city.karatsu.lg.jp/page/1039.html)）
- 内容: 各エリアに15分以上滞在した人の月間延べ人数（来街者ベース）。auスマホ利用者から個人を特定しない形で集計
- 6エリア: 唐津駅周辺 / 中央商店街 / 中心市街地北側 / 浜崎駅周辺 / 呼子朝市 / 鎮西町名護屋・波戸
- 期間: 月次 2019年〜 / 時間帯・年代別 2020〜2024年

## 公開構成

`civictech-karatsu.org` はパス方式のマルチアプリ構成です。ハブのルーター Worker
（`civictech-karatsu/site` リポジトリ内 `worker/`）が `/people-flow/*` をこのプロジェクトの
Pages（`karatsu-people-flow.pages.dev`）へ転送します。そのため `vite.config.ts` の
`base: "/people-flow/"` でビルドします。

## 開発

```bash
npm install
npm run data     # Excelを解析して public/data.json を生成
npm run dev      # 開発サーバ
npm run build    # 本番ビルド(dist/)
npm run preview  # ビルド結果をローカル確認
```

## データ更新

唐津市がExcelを更新したら（`raw-data/` のファイルを差し替え、または `scripts/build-data.mjs`
の取得処理を追加して）以下で反映します。

```bash
npm run data
npm run build
npx wrangler pages deploy dist --project-name=karatsu-people-flow --branch=main
```

## 構成

```
scripts/build-data.mjs   Excel(3ファイル) → data.json 整形
raw-data/*.xlsx          元Excel(23626=月次, 22720=属性時間帯, 22721=年代時間帯)
public/data.json         アプリが読み込む整形済みデータ
src/
  App.tsx                画面全体・月スライダー・指標切替
  components/
    FlowMap.tsx          国土地理院タイル + エリア円(react-leaflet)
    AreaDetail.tsx       エリア詳細(月次推移・時間帯・年代別グラフ)
  lib/data.ts            読み込み・整形・配色ヘルパ
```

## 注意

- エリアの円は各地区の**おおよその中心座標**に配置しています（元データは範囲指定のため、座標は目安）。
- 「平日／休日」は1日あたりの平均人数、「居住者／勤務者／来街者」「年代別」は月間延べ人数です。
- 本アプリは市公式のものではありません。数値は元データをご確認ください。
