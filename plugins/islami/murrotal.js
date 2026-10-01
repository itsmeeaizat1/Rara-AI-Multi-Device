// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { load } from 'cheerio'
import config from "../../config.js";
import te from "../../src/lib/rara-error.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "murrotal",
  alias: ["murrotal"],
  category: "islami",
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
    return m.reply(raraWrap("murrotal", [
      "Murottal Al-Quran audio per surah.",
      "",
      `📌 Format: ${m.prefix}murrotal <nama surah>`,
      "",
      `💡 Contoh: ${m.prefix}murrotal al fatihah`,
    ]));
  }
  try {
    await m.react("🕒");

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
      await m.react("❌");
      return m.reply(raraWrap("murrotal", `❌ Surah *${query}* tidak ditemukan`));
    }
    await m.react("🐣");
    await sock.sendMedia(m.chat, find.audio, null, m, {
      type: "audio",
    });
  } catch (e) {
    await m.react("❌");
    m.reply(raraWrap("murrotal", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
