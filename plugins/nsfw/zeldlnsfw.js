// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 .zeldlnsfw — 6 downloader NSFW zelapi (kategori download):
//   missav | nekopoi | eporner | kingbokep | pixhentai | tokyomotion
// 🔹 DEFAULT DISABLED (aturan owner 15 Sep 2026: "nsfw di disabled aja
//   fiturnya") — aktifin lewat kode: isEnabled: true.
// ═════════════════════════════════════════════

import {
  zeldlDownload, ZEL_DL_NSFW_KINDS, collectLinks, pickDirectLink, mediaTypeOf,
  _setZelDlHttpForTest, _setZelDlKeyForTest,
} from "../../src/scraper/zeldl.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { fetchBuffer } from "../../src/lib/rara-utils.js";

let _fetchBufferForTest;
export function _setFetchBufferForTest(fn) { _fetchBufferForTest = fn; }
const getBuf = async (u) => (_fetchBufferForTest ? _fetchBufferForTest(u) : fetchBuffer(u));

const pluginConfig = {
  name: "zeldlnsfw",
  alias: ["zmissav", "znekopoi", "zeporner", "zkingbokep", "zpixhentai", "ztokyomotion"],
  category: "nsfw",
  description: "Downloader NSFW via ZelAPI (MissAV/NekoPoi/Eporner dll) — default nonaktif",
  usage: ".zeldlnsfw <kind> <url> — atau .zmissav <url> dll",
  example: ".zmissav <link>",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 20, energi: 2,
  isEnabled: false, // NSFW: nonaktif sampai diaktifkan owner lewat kode
};

const CMD_KIND = { zmissav: "missav", znekopoi: "nekopoi", zeporner: "eporner", zkingbokep: "kingbokep", zpixhentai: "pixhentai", ztokyomotion: "tokyomotion" };

function safeName(title, ext) {
  const base = (title || "zelapi-media").replace(/[\\/:*?"<>|\n\r]/g, "").trim().slice(0, 60) || "zelapi-media";
  return `${base}.${ext}`;
}
const extOf = (u) => (String(u).split("?")[0].match(/\.([a-z0-9]{2,5})$/i)?.[1] || "mp4").toLowerCase();

async function handler(m, { sock }) {
  try {
    const command = String(m.command || "").toLowerCase();
    const args = (m.args || []).map(String);
    let kind = CMD_KIND[command] || null;
    let raw = args.join(" ").trim();
    if (!kind && args.length) {
      const k = args[0].toLowerCase();
      if (ZEL_DL_NSFW_KINDS[k]) { kind = k; raw = args.slice(1).join(" ").trim(); }
    }
    if (!raw) {
      await m.reply(raraWrap("zeldlnsfw", [
        "⚠️ DOWNLOADER NSFW ZELAPI — fitur nonaktif by default.",
        "",
        "6 engine: .zmissav · .znekopoi · .zeporner · .zkingbokep · .zpixhentai · .ztokyomotion",
        "",
        "Aktifin lewat kode (isEnabled: true) kalau mau nyala.",
      ].join("\n")));
      return;
    }
    if (!kind) {
      await m.reply(raraWrap("zeldlnsfw", "Kind gak dikenal — pilihan: " + Object.keys(ZEL_DL_NSFW_KINDS).join(" / ")));
      return;
    }
    await m.react("🧠");
    const r = await zeldlDownload(kind, raw);
    if (!r.ok) { await m.react("❌"); await m.reply(raraWrap("zeldlnsfw", `${ZEL_DL_NSFW_KINDS[kind].label} bermasalah: ${r.error}`)); return; }
    const links = collectLinks(r.data);
    if (!links.length) { await m.react("❌"); await m.reply(raraWrap("zeldlnsfw", "Gak nemu link unduhan buat URL ini")); return; }
    const direct = pickDirectLink(links);
    const lines = [`✅ ${ZEL_DL_NSFW_KINDS[kind].label}`, "", `📥 ${links.length} link:`];
    links.slice(0, 5).forEach((l, i) => lines.push(`${i + 1}. ${String(l.url).slice(0, 90)}${l.label ? " (" + l.label + ")" : ""}`));
    await m.reply(raraWrap("zeldlnsfw", lines.join("\n")));
    if (direct) {
      try {
        const buf = await getBuf(direct.url);
        if (buf && buf.length > 1000) {
          const t = mediaTypeOf(direct.url);
          if (t === "audio") await sock.sendMessage(m.chat, { audio: buf, mimetype: "audio/mpeg", ptt: false, fileName: safeName(r.data?.title, "mp3") }, { quoted: m });
          else if (t === "image") await sock.sendMessage(m.chat, { image: buf }, { quoted: m });
          else await sock.sendMessage(m.chat, { video: buf, mimetype: "video/mp4" }, { quoted: m });
        }
      } catch { /* link list udah dikirim */ }
    }
    await m.react("🐣");
  } catch (e) {
    try { await m.react("❌"); } catch {}
    await m.reply(raraWrap("zeldlnsfw", `fitur error: ${e?.message || e}`));
  }
}

export default { pluginConfig, handler, command: pluginConfig.name };
export { pluginConfig as config, handler };
