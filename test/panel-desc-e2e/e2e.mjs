// RARA AI - MULTI DEVICE — E2E: watermark deskripsi server panel (8 Okt 2026)
// Deskripsi server Pterodactyl (Settings → Server Description) wajib bawa watermark
// "RARA AI - MULTI DEVICE | by Aizat" di SEMUA jalur create (cpanel x2, cp, createserver, auto-order).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);
let pass = 0, fail = 0;
function t(name, cond, info) {
  if (cond) { pass++; console.log("  ✅ " + name); }
  else { fail++; console.error("  ❌ " + name, info !== undefined ? JSON.stringify(info)?.slice(0, 220) : ""); }
}
const section = (x) => console.log("\n— " + x + " —");

section("1. helper buildServerDescription");
const { buildServerDescription, PANEL_WATERMARK } = await import(R + "/src/lib/panel/description.js");
t("1a konstanta watermark", PANEL_WATERMARK === "RARA AI - MULTI DEVICE | by Aizat", PANEL_WATERMARK);
const d = buildServerDescription("Created at 8 Oktober 2026 08:00 [V1] [CLIENT]");
t("1b isi asli tetap ada", d.startsWith("Created at 8 Oktober 2026 08:00 [V1] [CLIENT]"), d);
t("1c watermark nama bot + by Aizat", d.includes("RARA AI - MULTI DEVICE") && d.includes("by Aizat"), d);
t("1d idempoten (gak dobel)", buildServerDescription(d) === d && d.split("by Aizat").length === 2);
t("1e input kosong → watermark doang", buildServerDescription("").includes("by Aizat") && buildServerDescription(null).includes("RARA AI"));
t("1f dalam batas 255 karakter panel", d.length < 255, d.length);

section("2. semua jalur create pakai helper");
const files = {
  "plugins/panel/cpanel.js": 2,
  "plugins/panel/cp.js": 1,
  "plugins/panel/createserver.js": 1,
  "src/lib/rara-auto-order.js": 1,
};
for (const [f, n] of Object.entries(files)) {
  const s = fs.readFileSync(path.join(R, f), "utf8");
  const used = (s.match(/description:\s*buildServerDescription\(/g) || []).length;
  t(`2 ${f}: ${n} titik pakai buildServerDescription`, used === n, used);
  t(`2 ${f}: import helper`, /import \{ buildServerDescription \} from "[^"]*description\.js"/.test(s));
  t(`2 ${f}: gak ada description mentah tersisa`, !/description:\s*`/.test(s));
}

section("3. auto-order beneran kirim watermark ke API panel");
const ao = await import(R + "/src/lib/rara-auto-order.js");
let sent = null;
ao._setAutoOrderHttpForTest({
  post: async (url, body) => {
    if (url.endsWith("/users")) return { data: { attributes: { id: 9 } } };
    if (url.endsWith("/servers")) { sent = body; return { data: { attributes: { id: 5 } } }; }
    return { data: {} };
  },
  get: async () => ({ data: { attributes: { startup: "npm start" } } }),
});
const pkgKey = Object.keys(ao.RAM_PACKAGES || { "1gb": 1 })[0];
const res = await ao.provisionPanel({ domain: "http://x", apikey: "ptla_x", egg: 1, nestid: 1, location: 2 }, pkgKey, "tesdesc");
ao._resetAutoOrderHttpForTest();
t("3a provision ok", res.ok === true, res);
t("3b description server bawa watermark", !!sent && sent.description.includes("RARA AI - MULTI DEVICE") && sent.description.includes("by Aizat"), sent?.description);

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
