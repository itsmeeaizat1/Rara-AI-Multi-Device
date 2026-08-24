// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import te from "../../src/lib/nova-error.js";
import novaApi from "../../src/lib/nova-apimanager.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "spotplay",
  alias: ["spotplay", "spplay", "spotifysrc"],
  category: "search",
  description: "Putar musik dari Spotify",
  usage: ".spotplay <query>",
  example: ".spotplay neffex grateful",
  cooldown: 20,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const query = m.text?.trim();
  if (!query)
    { const __navText = `⚠️ *Cara Pakai*\n\n> \`${m.prefix}spotplay <query>\``; return await m.reply( __navText, "spotplay"); };

  m.react("🕒");

  try {
    const data = await novaApi.azbry.spotplay(query, {
      timeout: 30000,
      headers: {
        "user-agent": "Mozilla/5.0",
      },
    });

    if (!data?.status || !data?.result?.downloadLink) {
      throw new Error(data?.message || "Lagu Spotify tidak ditemukan");
    }

    const result = data.result;

    await sock.sendMedia(m.chat, result.downloadLink, null, m, {
      type: "audio",
      mimetype: "audio/mpeg",
      ptt: false,
      fileName: `${result.artist || "Spotify"} - ${result.title || "audio"}.mp3`,
    });

    m.react("🐣");
  } catch (e) {
    console.log(e);
    m.reply(claraWrap("spotplay", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
