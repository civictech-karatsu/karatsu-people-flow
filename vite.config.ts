import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// civictech-karatsu.org/people-flow 配下で配信する。
// ハブのルーター Worker が /people-flow プレフィックスを除去して
// karatsu-people-flow.pages.dev へ転送するため base を絶対パス化する。
export default defineConfig({
  base: "/people-flow/",
  plugins: [react()],
});
