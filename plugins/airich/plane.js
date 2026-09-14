// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 SPACE RUSH .plane — EKSPERIMEN AI RICH RESPONSE (plugin pertama
//   kategori airich/). BUKAN fitur biasa: WhatsApp nge-render HALAMAN
//   HTML LANGSUNG di chat (bukan webview/link) via richResponseMessage
//   GenAI HTML primitive (pola pesan bot Meta AI) yang di-relay manual.
// 🔹 Sumber (karya noxXza — request owner 14 Sep 2026, eksperimen):
//   certificate: raw noxXza/data certificate.json (chain 2 — WAVERIFIED)
//   payload:     raw noxXza/data plane.html (game HTML 15.5KB)
// 🔹 Struktur pesan VERBATIM dari kode owner — sekarang hidup di engine
//   src/lib/nova-airich.js (dipake semua plugin airich/).:
//   messageContextInfo.botMetadata.verificationMetadata (proofs v1
//   NOXZA_EXE + signature + certificateChain) + botForwardedMessage
//   richResponseMessage AI_RICH_RESPONSE_TYPE_STANDARD +
//   unifiedResponse.data = base64(JSON { sections → GenAI HTML payload }).
// 🔹 Catatan: kalau format ini ditolak/diubah Meta, tinggal update
//   struktur di buildRichResponse() — sumber & alur gak berubah.
// ============================================================
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
// engine bersama (mulai .googleairich, logika relay/pindah ke src/lib/nova-airich.js)
import { sendRichResponse } from "../../src/lib/nova-airich.js";

// re-export buat e2e (struktur & polish sekarang hidup di engine)
export { polishPayload, buildRichResponse } from "../../src/lib/nova-airich.js";

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

// ── seams http buat e2e offline ──
const __planeHttp = {};
export function _setPlaneHttpForTest(h) { Object.assign(__planeHttp, h); }
export function _resetPlaneHttpForTest() { for (const k of Object.keys(__planeHttp)) delete __planeHttp[k]; }

async function fetchPayload() {
  const get = __planeHttp.getText
    || ((url) => axios.get(url, { timeout: 20000, responseType: "text", transformResponse: [(d) => d] }).then((r) => r.data));
  const html = await get(PAYLOAD_URL);
  if (!html || html.length < 500 || !/<[a-z]/i.test(html)) throw new Error("payload HTML kosong/gak valid");
  return html;
}

async function handler(m, { sock }) {
  try {
    await m.react("🧠");

    const htmlPayload = await fetchPayload();
    await m.react("🛠️");

    await sendRichResponse(sock, m.chat, htmlPayload, { title: "Space Rush 🚀\n*Tap kiri/kanan* buat manuver — hindari meteor!" });

    await m.react("🐣");
  } catch (err) {
    console.error("plane error:", err);
    await m.react("❌");
    return m.reply(claraWrap("plane", "gagal memuat game: " + (err?.message || "error"), "error"));
  }
}

export default { pluginConfig, handler, command: "plane" };
