// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { load } from 'cheerio'
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "murrotal",
  alias: ["murrotal"],
  category: "islamic",
  description: "Dengarkan audio murottal Al-Quran berdasarkan surah",
  usage: ".murrotal <nama surah>",
  example: ".murrotal al fatihah",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const query = m.args?.join(" ")?.trim();

  if (!query) {
    return m.reply( `🎧 *ᴍᴜʀʀᴏᴛᴛᴀʟ*\n\n` +
        `Masukkan nama surah\n\n` +
        `\`Contoh: ${m.prefix}murrotal al fatihah\`\n` +
        `\`Contoh: ${m.prefix}murrotal ar rahman\``, "murrotal");
  }
  try {

    const res = await fetch("https://islamipedia.id/murottal/");
    const html = await res.text();
    const $ = load(html);

    const data = $(".surah-item")
      .map((i, el) => ({
        no: parseInt($(el).find("h5").text().split(".")[0]),
        surah: ($(el).attr("data-title") || "").toLowerCase(),
        arti: $(el).find("p").text().trim(),
        audio: $(el).attr("data-audio") || "",
      }))
      .get();

    const q = query.toLowerCase();
    const find = data.find((v) =>
      v.surah.replace(/[^a-z0-9]/g, "").includes(q.replace(/[^a-z0-9]/g, "")),
    );

    if (!find || !find.audio) {
      return m.reply(claraWrap("murrotal", `❌ Surah *${query}* tidak ditemukan`));
    }
    await sock.sendMedia(m.chat, find.audio, null, m, {
      type: "audio",
    });
  } catch (e) {
    m.reply(claraWrap("murrotal", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
