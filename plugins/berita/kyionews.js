// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// kyionews.js — KyioAPI kategori News (12 endpoint) — api.kyio.web.id.
// FREE TIER TANPA KEY (10 RPM). Key opsional: .setkey kyio <api_key> -> 120 RPM + premium.
// Semua cmd pakai prefix .kyio biar gak bentrok fitur lain. TABEL endpoint ada di file ini,
// engine generik di src/lib/nova-kyio.js — tiap kategori bisa diedit sendiri-sendiri.
import { runKyioTable } from "../../src/lib/nova-kyio.js";

const TABLE = [
  { cmd: "kyiojagatplay", path: "/api/v2/jagatplay", param: "none", method: "GET", hint: ".kyiojagatplay" },
  { cmd: "kyioantara", path: "/api/v2/search/antara", param: "none", method: "GET", hint: ".kyioantara" },
  { cmd: "kyiocnbc", path: "/api/v2/search/cnbc", param: "none", method: "GET", hint: ".kyiocnbc" },
  { cmd: "kyiocnn", path: "/api/v2/search/cnn", param: "none", method: "GET", hint: ".kyiocnn" },
  { cmd: "kyiokompas", path: "/api/v2/search/kompas", param: "none", method: "GET", hint: ".kyiokompas" },
  { cmd: "kyiokuburaya", path: "/api/v2/search/kuburaya", param: "none", method: "GET", hint: ".kyiokuburaya" },
  { cmd: "kyionatgeo", path: "/api/v2/search/natgeo", param: "none", method: "GET", hint: ".kyionatgeo" },
  { cmd: "kyionews", path: "/api/v2/news/all", param: "none", method: "GET", hint: ".kyionews (berita gabungan)" },
  { cmd: "kyionewsdetail", path: "/api/v2/search/news-detail", param: "url", method: "GET", hint: ".kyionewsdetail <url berita>" },
  { cmd: "kyiopontianakinfo", path: "/api/v2/news/pontianakinfo", param: "none", method: "GET", hint: ".kyiopontianakinfo" },
  { cmd: "kyiopontianakpost", path: "/api/v2/news/pontianakpost", param: "none", method: "GET", hint: ".kyiopontianakpost" },
  { cmd: "kyiohackernews", path: "/api/v2/news/hackernews", param: "none", method: "GET", hint: ".kyiohackernews" },
];

const pluginConfig = {
  name: "kyionews",
  alias: ["kyionews", "kyiojagatplay", "kyioantara", "kyiocnbc", "kyiocnn", "kyiokompas", "kyiokuburaya", "kyionatgeo", "kyionews", "kyionewsdetail", "kyiopontianakinfo", "kyiopontianakpost", "kyiohackernews"],
  category: "berita",
  desc: "KyioAPI News — 12 endpoint (.kyio* dkk, sumber api.kyio.web.id)",
  usage: ".kyiojagatplay",
  isOwner: false,
};

async function handler(m, { sock, db }) {
  return runKyioTable(m, sock, TABLE, { title: "Kyio News" });
}

export { handler, pluginConfig, TABLE, pluginConfig as config };
export default handler;
