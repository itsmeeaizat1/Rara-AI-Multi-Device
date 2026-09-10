// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaGuide } from "../../src/lib/nova-menu-style.js";
import { sendRichMessage } from "../../src/lib/nova-rich-response.js";
import {
  getYouTubeInfo, formatYouTubeRich, formatNumber, formatDuration,
} from "../../src/lib/nova-youtube-info.js";

const pluginConfig = {
  name: "yts",
  alias: ["yts", "ytsearch", "yt", "youtube", "ytinfo"],
  category: "search",
  description: "Cari video YouTube — hasil dirender AI RICH di dalam chat (thumbnail + info + deskripsi), support link",
  usage: ".yts <kata kunci / link youtube>",
  example: ".yts lagu galau indonesia",
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock, text }) {
  const query = (text || m.text || "").trim();
  if (!query) {
    return m.reply(novaGuide("YTS", "Cari video di YouTube", `${m.prefix}yts <kata kunci / link>`));
  }

  try {
    await m.react("🕒");

    // info lengkap: link → piped detail | query → piped search + detail
    // (fallback yt-search otomatis di lib kalau piped mati semua)
    const info = await getYouTubeInfo(query);
    if (!info) {
      await m.react("❌");
      return m.reply("❌ Pencarian tidak menemukan hasil, coba kata kunci lain");
    }

    const v = info.video;
    const dur = v.duration ? formatDuration(v.duration) : "N/A";
    const chips = [
      `${m.prefix}playaudio ${v.title || query}`,
      `${m.prefix}playvideo ${v.title || query}`,
      `${m.prefix}ytmp3 ${v.url}`,
    ];

    // ── AI RICH (contoh owner 10 Sep 2026): thumbnail + table info +
    // deskripsi + link, dirender di dalam chat ala Meta AI ──
    const rich = formatYouTubeRich(v, { chips });
    const richOk = await sendRichMessage(sock, m.chat, rich);
    if (richOk) {
      await m.react("🐣");
      return;
    }

    // fallback format teks lama (client gak dukung rich / relay gagal)
    await m.react("🐣");
    const reply = [
      "✅ Ditemukan!",
      `Title: ${v.title}`,
      `Channel: ${v.uploaderName || "N/A"}`,
      `Duration: ${dur}`,
      `Views: ${formatNumber(v.viewCount)}`,
      `Upload: ${v.uploadedDate || "N/A"}`,
      `URL: ${v.url}`,
      `Audio: ${m.prefix}ytmp3 ${v.url}`,
      `Video: ${m.prefix}ytmp4 ${v.url}`,
    ].join("\n");
    return m.reply(reply);
  } catch (error) {
    console.error("[YTS]", error.message || error);
    await m.react("❌");
    return m.reply(`❌ Gagal mencari video: ${error.message || "Coba lagi nanti"}`);
  }
}

export { pluginConfig as config, handler };
