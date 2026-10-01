// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// kyiofun.js — KyioAPI kategori Fun (7 endpoint) — api.kyio.web.id.
// FREE TIER TANPA KEY (10 RPM). Key opsional: .setkey kyio <api_key> -> 120 RPM + premium.
// Semua cmd pakai prefix .kyio biar gak bentrok fitur lain. TABEL endpoint ada di file ini,
// engine generik di src/lib/rara-kyio.js — tiap kategori bisa diedit sendiri-sendiri.
import { runKyioTable } from "../../src/lib/rara-kyio.js";

const TABLE = [
  { cmd: "kyiotrivia", path: "/api/v2/fun/trivia", param: "none", method: "GET", hint: ".kyiotrivia" },
  { cmd: "kyiodongeng", path: "/api/v2/fun/dongeng", param: "q", method: "GET", hint: ".kyiodongeng <judul dongeng>" },
  { cmd: "kyiofactslides", path: "/api/v2/fun/factslides", param: "none", method: "GET", hint: ".kyiofactslides" },
  { cmd: "kyiogiphy", path: "/api/v2/fun/giphy", param: "q", method: "GET", hint: ".kyiogiphy <kata kunci gif>" },
  { cmd: "kyiostickerly", path: "/api/v2/fun/stickerly", param: "q", method: "GET", hint: ".kyiostickerly <kata kunci>" },
  { cmd: "kyiolahelu", path: "/api/v2/fun/lahelu", param: "none", method: "GET", hint: ".kyiolahelu" },
  { cmd: "kyiopantunis", path: "/api/v2/fun/pantunis", param: "q", method: "GET", hint: ".kyiopantunis <kata kunci>" },
];

const pluginConfig = {
  name: "kyiofun",
  alias: ["kyiofun", "kyiotrivia", "kyiodongeng", "kyiofactslides", "kyiogiphy", "kyiostickerly", "kyiolahelu", "kyiopantunis"],
  category: "fun",
  desc: "KyioAPI Fun — 7 endpoint (.kyio* dkk, sumber api.kyio.web.id)",
  usage: ".kyiotrivia",
  isOwner: false,
};

async function handler(m, { sock, db }) {
  return runKyioTable(m, sock, TABLE, { title: "Kyio Fun" });
}

export { handler, pluginConfig, TABLE, pluginConfig as config };
export default handler;
