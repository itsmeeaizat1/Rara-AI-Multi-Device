// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 SPACE RUSH .plane — EKSPERIMEN AI RICH RESPONSE (plugin pertama
//   kategori airich/). BUKAN fitur biasa: WhatsApp nge-render HALAMAN
//   HTML LANGSUNG di chat (bukan webview/link) via richResponseMessage
//   GenAI HTML primitive (pola pesan bot Meta AI) yang di-relay manual.
// 🔹 Sumber (karya noxXza — request owner 14 Sep 2026, eksperimen):
//   certificate: raw noxXza/data certificate.json (chain 2 — WAVERIFIED)
//   payload:     raw noxXza/data plane.html (game HTML 15.5KB)
// 🔹 Struktur pesan VERBATIM dari kode owner — sekarang hidup di engine
//   src/lib/rara-airich.js (dipake semua plugin airich/).:
//   messageContextInfo.botMetadata.verificationMetadata (proofs v1
//   NOXZA_EXE + signature + certificateChain) + botForwardedMessage
//   richResponseMessage AI_RICH_RESPONSE_TYPE_STANDARD +
//   unifiedResponse.data = base64(JSON { sections → GenAI HTML payload }).
// 🔹 Catatan: kalau format ini ditolak/diubah Meta, tinggal update
//   struktur di buildRichResponse() — sumber & alur gak berubah.
// ============================================================
import axios from "axios";
import fs from "node:fs";
import path from "node:path";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
// engine bersama (mulai .googleairich, logika relay/pindah ke src/lib/rara-airich.js)
import { sendRichResponse, notifyRichDownload } from "../../src/lib/rara-airich.js";

// re-export buat e2e (struktur & polish sekarang hidup di engine)
export { polishPayload, buildRichResponse } from "../../src/lib/rara-airich.js";

const pluginConfig = {
  name: "plane",
  // NOTE: "game" SENGAJA gak jadi alias — bentrok sama plugins/group/game.js
  // (kejadian .absen: loader last-wins, dead code).
  alias: ["plane", "spacerush", "airichgame"],
  category: "airich",
  description: "Space Rush 🚀 — game HTML AI Rich Response langsung di chat (EKSPERIMEN)",
  usage: ".plane",
  example: ".plane",
  isOwner: false, isPremium: false, isGroup: true, isPrivate: true,
  cooldown: 15, energi: 2, isEnabled: true,
};

const PAYLOAD_URL = "https://raw.githubusercontent.com/noxXza/data/refs/heads/main/plane.html";
// LOCAL FALLBACK (owner 7 Okt 2026: "knp g mncul cardnya") — payload
// game gak lagi 100% bergantung repo noxXza (bisa dicabut kapan aja).
// Urutan: remote (selalu fresh) → file lokal vendored → error jelas.
const LOCAL_PAYLOAD = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "..", "assets", "airich", "plane.html");

// ── seams http buat e2e offline ──
const __planeHttp = {};
export function _setPlaneHttpForTest(h) { Object.assign(__planeHttp, h); }
export function _resetPlaneHttpForTest() { for (const k of Object.keys(__planeHttp)) delete __planeHttp[k]; }

function validHtml(html) {
  return html && html.length >= 500 && /<[a-z]/i.test(html);
}

// 🔹 anti-scroll v3: dokumen game WAJIB punya scroll internal sendiri — scroll chat WA
// ada di layer native luar webview, jadi satu-satunya cara nangkep gesture adalah bikin
// webview-nya scrollable (body pan-y + min-height 101vh + overscroll contain).
function antiscrollPatch(html) {
  let out = String(html);
  out = out.replace(
    "touch-action: none; overflow: hidden;",
    "touch-action: pan-y; overflow-y: auto; overscroll-behavior: contain; min-height: 101vh;"
  );
  out = out.replace(
    "canvas { width: 100%; height: 100%; display: block; background: #070a12; }",
    "canvas { width: 100%; height: 100%; display: block; background: #070a12; touch-action: none; }"
  );
  if (!out.includes("overscroll-behavior")) {
    out = out.replace("</style>", "html, body { overscroll-behavior: contain; }\n</style>");
  }
  return out;
}

export async function fetchPayload() {
  // 1. remote (fresh)
  const get = __planeHttp.getText
    || ((url) => axios.get(url, { timeout: 20000, responseType: "text", transformResponse: [(d) => d] }).then((r) => r.data));
  try {
    const html = await get(PAYLOAD_URL);
    if (validHtml(html)) return antiscrollPatch(html);
  } catch (e) {
    console.error("[airich] payload remote gagal (" + (e?.message || e) + "), fallback lokal");
  }
  // 2. lokal vendored
  if (!__planeHttp.getText) {
    try {
      const html = fs.readFileSync(LOCAL_PAYLOAD, "utf-8");
      if (validHtml(html)) {
        console.error("[airich] pakai payload lokal assets/airich/plane.html");
        return html;
      }
    } catch (e) {
      console.error("[airich] payload lokal gak kebaca: " + (e?.message || e));
    }
  }
  throw new Error("payload game gak ketemu (remote mati & file lokal gak ada)");
}

async function handler(m, { sock }) {
  try {
    await m.react("🧠");

    const htmlPayload = await fetchPayload();
    await m.react("🛠️");

    await notifyRichDownload(m);
    await sendRichResponse(sock, m.chat, htmlPayload, { title: "Space Rush 🚀\n*Tap kiri/kanan* buat manuver — hindari meteor!" });

    await m.react("🐣");
  } catch (err) {
    console.error("plane error:", err);
    await m.react("❌");
    return m.reply(raraWrap("plane", "gagal memuat game: " + (err?.message || "error"), "error"));
  }
}

export default { pluginConfig, handler, command: "plane" };
// FIX 17 Sep 2026 (owner: "fitur ai rich knp cmd g bsa diakses"): loader
// nyari named export config + handler — default export doang bikin
// plugin DIAM-DIAM gak diregistrasi sejak awal. Default dipertahankan
// buat e2e (import default).
export { pluginConfig as config, handler };
