// `output: "standalone"` derlemesi .next/static ve public klasörlerini kopyalamaz.
// `node .next/standalone/server.js` bu dosyaları da sunabilsin diye build sonrası kopyalar.
import { cpSync, existsSync } from "node:fs";

cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
if (existsSync("public")) cpSync("public", ".next/standalone/public", { recursive: true });
