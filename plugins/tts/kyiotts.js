// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// kyiotts.js — KyioAPI kategori Text to Speech (4 endpoint) — api.kyio.web.id.
// FREE TIER TANPA KEY (10 RPM). Key opsional: .setkey kyio <api_key> -> 120 RPM + premium.
// Semua cmd pakai prefix .kyio biar gak bentrok fitur lain. TABEL endpoint ada di file ini,
// engine generik di src/lib/nova-kyio.js — tiap kategori bisa diedit sendiri-sendiri.
import { runKyioTable } from "../../src/lib/nova-kyio.js";

const TABLE = [
  { cmd: "kyioondoku", path: "/api/v2/ai/ondoku", param: "voice-text", method: "GET", hint: ".kyioondoku [voice]|<teks>" },
  { cmd: "kyioqwents", path: "/api/v2/ai/qwen-tts", param: "voice-text", method: "GET", hint: ".kyioqwents [voice]|<teks>" },
  { cmd: "kyioedgetts", path: "/api/v2/ai/edge-tts", param: "voice-text", method: "GET", hint: ".kyioedgetts [voice id-ID-ArdiNeural]|<teks>" },
  { cmd: "kyiogoogletts", path: "/api/v2/ai/google-tts", param: "voice-text", method: "GET", hint: ".kyiogoogletts [voice]|<teks>" },
];

const pluginConfig = {
  name: "kyiotts",
  alias: ["kyiotts", "kyioondoku", "kyioqwents", "kyioedgetts", "kyiogoogletts"],
  category: "tts",
  desc: "KyioAPI Text to Speech — 4 endpoint (.kyio* dkk, sumber api.kyio.web.id)",
  usage: ".kyioondoku [voice]|<teks>",
  isOwner: false,
};

async function handler(m, { sock, db }) {
  return runKyioTable(m, sock, TABLE, { title: "Kyio Text to Speech" });
}

export { handler, pluginConfig, TABLE, pluginConfig as config };
export default handler;
