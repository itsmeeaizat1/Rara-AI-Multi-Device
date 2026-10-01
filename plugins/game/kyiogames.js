// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// kyiogames.js — KyioAPI kategori Games & Other (5 endpoint) — api.kyio.web.id.
// FREE TIER TANPA KEY (10 RPM). Key opsional: .setkey kyio <api_key> -> 120 RPM + premium.
// Semua cmd pakai prefix .kyio biar gak bentrok fitur lain. TABEL endpoint ada di file ini,
// engine generik di src/lib/rara-kyio.js — tiap kategori bisa diedit sendiri-sendiri.
import { runKyioTable } from "../../src/lib/rara-kyio.js";

const TABLE = [
  { cmd: "kyiobluearchive", path: "/api/v2/bluearchive", param: "q", method: "GET", hint: ".kyiobluearchive <nama karakter>" },
  { cmd: "kyiomlbbcounter", path: "/api/v2/games/mlbb-counter", param: "q", method: "GET", hint: ".kyiomlbbcounter <nama hero>" },
  { cmd: "kyiozzz", path: "/api/v2/stalk/zzz", param: "uid", method: "GET", hint: ".kyiozzz <uid>" },
  { cmd: "kyiohsr", path: "/api/v2/stalk/hsr", param: "uid", method: "GET", hint: ".kyiohsr <uid>" },
  { cmd: "kyiogenshin", path: "/api/v2/stalk/genshin", param: "uid", method: "GET", hint: ".kyiogenshin <uid>" },
];

const pluginConfig = {
  name: "kyiogames",
  alias: ["kyiogames", "kyiobluearchive", "kyiomlbbcounter", "kyiozzz", "kyiohsr", "kyiogenshin"],
  category: "game",
  desc: "KyioAPI Games & Other — 5 endpoint (.kyio* dkk, sumber api.kyio.web.id)",
  usage: ".kyiobluearchive <nama karakter>",
  isOwner: false,
};

async function handler(m, { sock, db }) {
  return runKyioTable(m, sock, TABLE, { title: "Kyio Games & Other" });
}

export { handler, pluginConfig, TABLE, pluginConfig as config };
export default handler;
