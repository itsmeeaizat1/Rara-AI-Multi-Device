// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// aio2dl.js — receiver TERSEMBUNYI pilihan popup .aio2 (porting pola
// .gvid/.gaud/.gimg dari script JPM APENBOTZ). GAK dipanggil manual —
// id row popup ngirim `.aio2dl ext|mime|url`. Guard: URL WAJIB terdaftar
// di sesi popup chat itu (anti abuse orang pakai bot buat unduh URL
// sembarangan), TTL 20 menit.
import { fetchChoiceBuffer } from "../../src/scraper/nexray-dl.js";
import { isChoiceAllowed } from "../../src/lib/nova-aio2-session.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "aio2dl",
  alias: ["aio2dl"],
  category: "download",
  description: "Receiver pilihan popup .aio2 (internal)",
  usage: "(dipanggil dari popup .aio2)",
  example: ".aio2dl mp4|video/mp4|https://...",
  cooldown: 5,
  energi: 1,
  isEnabled: true,
  isHidden: true,
};

async function handler(m, { sock }) {
  const raw = String(m.text || "").trim();
  const parts = raw.split("|");
  if (parts.length < 3) {
    return m.reply(claraWrap("AIO v2", "Format pilihan gak valid — pilih ulang dari popup .aio2.", "error"));
  }
  const ext = String(parts[0]).toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const mime = String(parts[1]) || "application/octet-stream";
  const url = parts.slice(2).join("|").trim();

  if (!/^https?:\/\//i.test(url)) {
    return m.reply(claraWrap("AIO v2", "Link pilihan gak valid.", "error"));
  }
  if (!isChoiceAllowed(m.chat, url)) {
    return m.reply(claraWrap("AIO v2", "Pilihan itu udah kedaluwarsa (sesi 20 menit). Ketik .aio2 <link> ulang ya.", "error"));
  }

  try {
    await m.react("🛠️");
    const buf = await fetchChoiceBuffer(url);
    await sock.sendMessage(m.chat, {
      document: buf,
      mimetype: mime,
      fileName: `AIO2-${Date.now()}.${ext}`,
    }, { quoted: m });
    await m.react("🐣");
    return { handled: true };
  } catch (e) {
    await m.react("❌");
    return m.reply(claraWrap("AIO v2", `Gagal unduh file pilihan: ${e?.message || e}`, "error"));
  }
}

export { pluginConfig as config, handler };
