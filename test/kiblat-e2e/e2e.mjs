// E2E KIBLAT (kandidat langka terakhir backlog — request owner 13 Sep
// "ide fitur yg langka": kiblat ke-singgut tapi belum pernah dibikin).
// .kiblat — reply lokasi WA ATAU nama tempat (geocode Nominatim) →
// bearing great-circle ke Ka'bah + jarak haversine + kartu KOMPAS canvas
// (jarum merah arah qiblat + ikon Ka'bah). Semua http/canvas di-mock.
import fs from "node:fs";
import { initDatabase } from "../../src/lib/nova-database.js";
import plugin, { qiblaBearing, distanceToKaaba, renderKiblatCard, _setKiblatHttpForTest, _resetKiblatHttpForTest } from "../../plugins/islami/kiblat.js";
import { fromSC } from "../../src/lib/styler.js";

const DB = "/tmp/kiblat-e2e-db.json";
fs.rmSync(DB, { recursive: true, force: true });
await initDatabase(DB);

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const t = (name, ok, extra) => {
  w((ok ? "✅ " : "❌ ") + name + (ok ? "" : extra ? " — " + extra : ""));
  ok ? pass++ : fail++;
};

// ═══ 1. MATH — bearing & jarak (toleransi vs nilai referensi) ═══
w("\n— math qibla —");
const bJkt = qiblaBearing(-6.1702, 106.8096); // Monas
t("  Jakarta (Monas) ≈ 295° (nilai resmi qibla Jakarta)",
  bJkt > 294 && bJkt < 297, "→ " + bJkt.toFixed(2));
const dJkt = distanceToKaaba(-6.1702, 106.8096);
t("  jarak Jakarta ke Ka'bah ± 7.900 km", dJkt > 7800 && dJkt < 8100, "→ " + Math.round(dJkt));
const bIst = qiblaBearing(41.0082, 28.9784); // Istanbul
t("  Istanbul ≈ 151° (tenggara — beda daripada Indonesia)",
  bIst > 149 && bIst < 154, "→ " + bIst.toFixed(2));
t("  Medan barat-daya juga (±292°)", (() => { const b = qiblaBearing(3.5952, 98.6722); return b > 291 && b < 294; })());
// Ka'bah sendiri → bearing 0 (degenerasi) + jarak ~0
t("  dari Ka'bah sendiri jarak ≈ 0", distanceToKaaba(21.4225, 39.8262) < 1);
// simetri arah: dari antipode-ish tetap valid (0-360)
t("  bearing selalu 0..360", qiblaBearing(-41, -140.5) >= 0 && qiblaBearing(-41, -140.5) < 360);

// ═══ 2. RENDER kartu kompas (canvas asli) ═══
w("\n— render kompas canvas —");
let card = null;
try { card = await renderKiblatCard({ label: "Monas, Jakarta", lat: -6.17, lon: 106.81, bearing: 295.2, distance: 7915, dirLabel: "BL (Barat Laut)" }); } catch (e) { console.error("render:", e.message); }
t("  kartu ke-render (png > 30KB)", !!card && card.length > 30000, card ? card.length + "B" : "NULL");
if (card) {
  // verifikasi jarum merah di arah 295° (barat-laut atas) — jarum e63946
  const { createCanvas, loadImage } = await import("@napi-rs/canvas");
  const img = await loadImage(card);
  const cv = createCanvas(img.width, img.height);
  const cx2 = cv.getContext("2d");
  cx2.drawImage(img, 0, 0);
  const d = cx2.getImageData(0, 0, img.width, img.height).data;
  let redNeedle = 0;
  const rad = ((295.2 - 90) * Math.PI) / 180;
  for (let dist = 60; dist < 200; dist += 10) {
    const x = Math.round(360 + Math.cos(rad) * dist);
    const y = Math.round(430 + Math.sin(rad) * dist);
    const i = (y * img.width + x) * 4;
    if (d[i] > 180 && d[i + 1] < 110 && d[i + 2] < 110) redNeedle++;
  }
  t("  jarum merah ngarah 295° (barat daya atas)", redNeedle >= 5, "titik=" + redNeedle);
}

// ═══ 3. HANDLER — usage / geocode / reply lokasi / error ═══
w("\n— handler —");
const sent = [];
const mkM = (args, quoted) => ({
  args: args || [],
  quoted: quoted || null,
  chat: "g@test", sender: "u@test", prefix: ".",
  reply: async (x) => { sent.push({ text: String(x) }); },
  react: async () => true,
});
const sock = { sendMessage: async (chat, c) => { sent.push(c); return { key: {} }; } };
const plain = (s) => fromSC(String(s || "")).toLowerCase(); // balikin smallcaps (GOTCHA lama)

_resetKiblatHttpForTest();

// usage (tanpa args tanpa reply)
sent.length = 0;
await plugin.handler(mkM(), { sock });
t("  tanpa args/reply → guide cara pakai",
  sent.some((s) => plain(s.text).includes("reply pesan lokasi") && plain(s.text).includes("kiblat <nama tempat>")),
  JSON.stringify(sent.map((s) => plain(s.text).slice(0, 60))));

// geocode ketemu → kartu + caption
_setKiblatHttpForTest({
  get: async () => ({ data: [{ lat: "-6.1702", lon: "106.8096", display_name: "Monas, Jakarta, Indonesia" }] }),
});
sent.length = 0;
await plugin.handler(mkM(["Monas", "Jakarta"]), { sock });
t("  nama tempat → gambar kompas kekirim",
  sent.some((s) => s.image && s.image.length > 30000));
t("  caption: derajat 295° + mata angin BL + jarak 7.915 km",
  (() => { const cap = sent.find((s) => s.image)?.caption || ""; return /295\.\d°/.test(cap) && /BL \(Barat Laut\)/.test(cap) && /7\.915 km/.test(cap); })(),
  JSON.stringify((sent.find((s) => s.image)?.caption || "").slice(0, 200)));

// geocode gak nemu → error ramah
_setKiblatHttpForTest({ get: async () => ({ data: [] }) });
sent.length = 0;
await plugin.handler(mkM(["zzzznope", "xyz"]), { sock });
t("  tempat gak ketemu → error ramah",
  sent.some((s) => plain(s.text).includes("gak ketemu")),
  JSON.stringify(sent.map((s) => plain(s.text).slice(0, 60))));

// reply lokasi WA → langsung dari koordinat (tanpa geocode)
_resetKiblatHttpForTest();
let httpCalled = false;
_setKiblatHttpForTest({ get: async () => { httpCalled = true; return { data: [] }; } });
sent.length = 0;
await plugin.handler(mkM([], {
  locationMessage: { degreesLatitude: -6.1702, degreesLongitude: 106.8096, name: "Lokasiku" },
}), { sock });
t("  reply lokasi WA → kartu kompas dari koordinat langsung",
  sent.some((s) => s.image && s.image.length > 30000));
t("  gak manggil geocode (koordinat udah ada)", httpCalled === false);
t("  caption nunjukin sumber lokasi WA",
  /dari pesan WA/.test(sent.find((s) => s.image)?.caption || ""));

// nested shape .msg.locationMessage juga kebaca
sent.length = 0;
await plugin.handler(mkM([], { msg: { locationMessage: { degreesLatitude: -2.5, degreesLongitude: 140.7 } } }), { sock });
t("  nested .msg.locationMessage kebaca", sent.some((s) => s.image));

// ═══ 4. REGISTRASI plugin ═══
w("\n— registrasi —");
t("  command 'kiblat' + alias qibla", plugin.command === "kiblat" && plugin.pluginConfig.alias.includes("qibla"));
t("  kategori islami + enabled", plugin.pluginConfig.category === "islami" && plugin.pluginConfig.isEnabled === true);
t("  cd 10 / energi 1", plugin.pluginConfig.cooldown === 10 && plugin.pluginConfig.energi === 1);

w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
