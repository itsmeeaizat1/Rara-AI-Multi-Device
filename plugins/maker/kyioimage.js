// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// kyioimage.js — KyioAPI kategori Image (9 endpoint) — api.kyio.web.id.
// FREE TIER TANPA KEY (10 RPM). Key opsional: .setkey kyio <api_key> -> 120 RPM + premium.
// Semua cmd pakai prefix .kyio biar gak bentrok fitur lain. TABEL endpoint ada di file ini,
// engine generik di src/lib/nova-kyio.js — tiap kategori bisa diedit sendiri-sendiri.
import { runKyioTable } from "../../src/lib/nova-kyio.js";

const TABLE = [
  { cmd: "kyiozimage", path: "/api/v2/ai/zimage", param: "q", method: "GET", hint: ".kyiozimage <prompt gambar>" },
  { cmd: "kyionanobanana2", path: "/api/v2/nano-banana-v2", param: "url", method: "GET", hint: ".kyionanobanana2 <reply foto / url foto>" },
  { cmd: "kyiotoanime", path: "/api/v2/ai-editor/toanime", param: "url", method: "GET", hint: ".kyiotoanime <reply foto>" },
  { cmd: "kyiobotak", path: "/api/v2/ai-editor/tobotak", param: "url", method: "GET", hint: ".kyiobotak <reply foto>" },
  { cmd: "kyiotocewek", path: "/api/v2/ai-editor/tocewek", param: "url", method: "GET", hint: ".kyiotocewek <reply foto>" },
  { cmd: "kyiotocowok", path: "/api/v2/ai-editor/tocowok", param: "url", method: "GET", hint: ".kyiotocowok <reply foto>" },
  { cmd: "kyiotoghibli", path: "/api/v2/ai-editor/toghibli", param: "url", method: "GET", hint: ".kyiotoghibli <reply foto>" },
  { cmd: "kyiotoreal", path: "/api/v2/ai-editor/toreal", param: "url", method: "GET", hint: ".kyiotoreal <reply foto>" },
  { cmd: "kyiotext2img", path: "/api/v2/text2img", param: "q", method: "GET", hint: ".kyiotext2img <prompt> (premium — 3x gratis)", note: "premium, 3x gratis" },
];

const pluginConfig = {
  name: "kyioimage",
  alias: ["kyioimage", "kyiozimage", "kyionanobanana2", "kyiotoanime", "kyiobotak", "kyiotocewek", "kyiotocowok", "kyiotoghibli", "kyiotoreal", "kyiotext2img"],
  category: "maker",
  desc: "KyioAPI Image — 9 endpoint (.kyio* dkk, sumber api.kyio.web.id)",
  usage: ".kyiozimage <prompt gambar>",
  isOwner: false,
};

async function handler(m, { sock, db }) {
  return runKyioTable(m, sock, TABLE, { title: "Kyio Image" });
}

export { handler, pluginConfig, TABLE, pluginConfig as config };
export default handler;
