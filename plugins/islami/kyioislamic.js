// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// kyioislamic.js — KyioAPI kategori Islamic (6 endpoint) — api.kyio.web.id.
// FREE TIER TANPA KEY (10 RPM). Key opsional: .setkey kyio <api_key> -> 120 RPM + premium.
// Semua cmd pakai prefix .kyio biar gak bentrok fitur lain. TABEL endpoint ada di file ini,
// engine generik di src/lib/nova-kyio.js — tiap kategori bisa diedit sendiri-sendiri.
import { runKyioTable } from "../../src/lib/nova-kyio.js";

const TABLE = [
  { cmd: "kyioislamicinfo", path: "/api/v2/islamic/info", param: "none", method: "GET", hint: ".kyioislamicinfo" },
  { cmd: "kyiojadwalsholat", path: "/api/v2/islamic/jadwal-sholat", param: "q", method: "GET", hint: ".kyiojadwalsholat <nama kota>" },
  { cmd: "kyiokisahnabi", path: "/api/v2/islamic/kisah-nabi", param: "q", method: "GET", hint: ".kyiokisahnabi <nama nabi>" },
  { cmd: "kyiotahlil", path: "/api/v2/islamic/tahlil", param: "none", method: "GET", hint: ".kyiotahlil" },
  { cmd: "kyioalquran", path: "/api/v2/al-quran", param: "q", method: "GET", hint: ".kyioalquran <nama surat>" },
  { cmd: "kyioprayers", path: "/api/v2/islamic-prayers", param: "none", method: "GET", hint: ".kyioprayers" },
];

const pluginConfig = {
  name: "kyioislamic",
  alias: ["kyioislamic", "kyioislamicinfo", "kyiojadwalsholat", "kyiokisahnabi", "kyiotahlil", "kyioalquran", "kyioprayers"],
  category: "islami",
  desc: "KyioAPI Islamic — 6 endpoint (.kyio* dkk, sumber api.kyio.web.id)",
  usage: ".kyioislamicinfo",
  isOwner: false,
};

async function handler(m, { sock, db }) {
  return runKyioTable(m, sock, TABLE, { title: "Kyio Islamic" });
}

export { handler, pluginConfig, TABLE };
export default handler;
