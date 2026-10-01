// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// kyioinfo.js — KyioAPI kategori Information (17 endpoint) — api.kyio.web.id.
// FREE TIER TANPA KEY (10 RPM). Key opsional: .setkey kyio <api_key> -> 120 RPM + premium.
// Semua cmd pakai prefix .kyio biar gak bentrok fitur lain. TABEL endpoint ada di file ini,
// engine generik di src/lib/rara-kyio.js — tiap kategori bisa diedit sendiri-sendiri.
import { runKyioTable } from "../../src/lib/rara-kyio.js";

const TABLE = [
  { cmd: "kyiosipongi", path: "/api/v2/info/sipongi", param: "none", method: "GET", hint: ".kyiosipongi (karhutla & hotspot)" },
  { cmd: "kyiomlbb", path: "/api/v2/stalk/ml", param: "q", method: "GET", hint: ".kyiomlbb <nickname/id MLBB>" },
  { cmd: "kyiomlbbstalk", path: "/api/v2/mlbbstalk", param: "q", method: "GET", hint: ".kyiomlbbstalk <nickname/id MLBB>" },
  { cmd: "kyioigstalk2", path: "/api/v2/info/igstalk-v2", param: "q", method: "GET", hint: ".kyioigstalk2 <username IG>" },
  { cmd: "kyioigstalk3", path: "/api/v2/info/igstalk-v3", param: "q", method: "GET", hint: ".kyioigstalk3 <username IG>" },
  { cmd: "kyiogempa", path: "/api/v2/bmkg", param: "none", method: "GET", hint: ".kyiogempa (info gempa terbaru BMKG)" },
  { cmd: "kyioiplookup", path: "/api/v2/iplookup", param: "q", method: "GET", hint: ".kyioiplookup <ip/domain>" },
  { cmd: "kyiojsonplaceholder", path: "/api/v2/info/placeholder", param: "none", method: "GET", hint: ".kyiojsonplaceholder" },
  { cmd: "kyioigprofile", path: "/api/v2/info/ig-profile", param: "q", method: "GET", hint: ".kyioigprofile <username IG>" },
  { cmd: "kyiotiktokuser", path: "/api/v2/info/tiktok", param: "q", method: "GET", hint: ".kyiotiktokuser <username TikTok>" },
  { cmd: "kyiotwstalk", path: "/api/v2/info/twitter-stalk", param: "q", method: "GET", hint: ".kyiotwstalk <username X/Twitter>" },
  { cmd: "kyioiplookup2", path: "/api/v2/info/ip-lookup", param: "q", method: "GET", hint: ".kyioiplookup2 <ip>" },
  { cmd: "kyiotiktokstalk2", path: "/api/v2/info/tiktok-stalk-v2", param: "q", method: "GET", hint: ".kyiotiktokstalk2 <username TikTok>" },
  { cmd: "kyiowayback", path: "/api/v2/info/wayback", param: "q", method: "GET", hint: ".kyiowayback <url domain>" },
  { cmd: "kyiospekhp", path: "/api/v2/info/spek-hp", param: "q", method: "GET", hint: ".kyiospekhp <nama hp>" },
  { cmd: "kyiobandinghp", path: "/api/v2/info/banding-hp", param: "q", method: "GET", hint: ".kyiobandinghp <hp1 vs hp2>" },
  { cmd: "kyiodapodik", path: "/api/v2/info/dapodik", param: "q", method: "GET", hint: ".kyiodapodik <nama sekolah>" },
];

const pluginConfig = {
  name: "kyioinfo",
  alias: ["kyioinfo", "kyiosipongi", "kyiomlbb", "kyiomlbbstalk", "kyioigstalk2", "kyioigstalk3", "kyiogempa", "kyioiplookup", "kyiojsonplaceholder", "kyioigprofile", "kyiotiktokuser", "kyiotwstalk", "kyioiplookup2", "kyiotiktokstalk2", "kyiowayback", "kyiospekhp", "kyiobandinghp", "kyiodapodik"],
  category: "search",
  desc: "KyioAPI Information — 17 endpoint (.kyio* dkk, sumber api.kyio.web.id)",
  usage: ".kyiosipongi (karhutla & hotspot)",
  isOwner: false,
};

async function handler(m, { sock, db }) {
  return runKyioTable(m, sock, TABLE, { title: "Kyio Information" });
}

export { handler, pluginConfig, TABLE, pluginConfig as config };
export default handler;
