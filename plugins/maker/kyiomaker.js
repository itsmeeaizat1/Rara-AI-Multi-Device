// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// kyiomaker.js — KyioAPI kategori Maker (9 endpoint) — api.kyio.web.id.
// FREE TIER TANPA KEY (10 RPM). Key opsional: .setkey kyio <api_key> -> 120 RPM + premium.
// Semua cmd pakai prefix .kyio biar gak bentrok fitur lain. TABEL endpoint ada di file ini,
// engine generik di src/lib/nova-kyio.js — tiap kategori bisa diedit sendiri-sendiri.
import { runKyioTable } from "../../src/lib/nova-kyio.js";

const TABLE = [
  { cmd: "kyioiqc", path: "/api/v2/maker/iqc", param: "q", method: "GET", hint: ".kyioiqc <teks>" },
  { cmd: "kyioqwa", path: "/api/v2/maker/qwa", param: "q", method: "POST", hint: ".kyioqwa <teks> (quote WA)" },
  { cmd: "kyioavatar", path: "/api/v2/maker/avatar", param: "q", method: "GET", hint: ".kyioavatar <nama>" },
  { cmd: "kyiocodesnap", path: "/api/v2/maker/codesnap", param: "q", method: "GET", hint: ".kyiocodesnap <kode program>" },
  { cmd: "kyioquotemaker", path: "/api/v2/maker/quote", param: "q", method: "GET", hint: ".kyioquotemaker <teks|nama|tipe>" },
  { cmd: "kyiobrat", path: "/api/v2/maker/brat", param: "text", method: "GET", hint: ".kyiobrat <teks>" },
  { cmd: "kyiobrat2", path: "/api/v2/maker/brat2", param: "text", method: "GET", hint: ".kyiobrat2 <teks> (video animasi)" },
  { cmd: "kyiobratvid", path: "/api/v2/maker/bratvid", param: "text", method: "GET", hint: ".kyiobratvid <teks> (GIF animasi)" },
  { cmd: "kyiohtml2img", path: "/api/v2/maker/html2image", param: "q", method: "GET", hint: ".kyiohtml2img <kode HTML>" },
];

const pluginConfig = {
  name: "kyiomaker",
  alias: ["kyiomaker", "kyioiqc", "kyioqwa", "kyioavatar", "kyiocodesnap", "kyioquotemaker", "kyiobrat", "kyiobrat2", "kyiobratvid", "kyiohtml2img"],
  category: "maker",
  desc: "KyioAPI Maker — 9 endpoint (.kyio* dkk, sumber api.kyio.web.id)",
  usage: ".kyioiqc <teks>",
  isOwner: false,
};

async function handler(m, { sock, db }) {
  return runKyioTable(m, sock, TABLE, { title: "Kyio Maker" });
}

export { handler, pluginConfig, TABLE };
export default handler;
