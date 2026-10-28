// An `output: "standalone"` build does not copy the .next/static and public folders.
// This copies them after the build so `node .next/standalone/server.js` can serve them too.
import { cpSync, existsSync } from "node:fs";

cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
if (existsSync("public")) cpSync("public", ".next/standalone/public", { recursive: true });
