// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ikyy-text2img — Generate gambar dari teks via IkyyXD text2img
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "ikyy-text2img",
  alias: ["ikyy-text2img"],
  category: "ai image",
  description: "Generate gambar dari teks via IkyyXD Text2Img",
  usage: ".ikyy-text2img <prompt>",
  example: ".ikyy-text2img kucing lucu bermain di taman\n.ikyy-text2img pemandangan gunung bersalju",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 20, energi: 3, isEnabled: true,
};

const IKYY_BASE = "https://api.ikyyxd.my.id";

async function handler(m, { sock }) {
  try {
    const prefix = m.prefix || ".";
    const text = m.text?.trim() || m.args?.join(" ").trim() || "";

    if (!text) {
      return m.reply(claraWrap("Ikyy Text2Img", [
        "Generate gambar dari teks via IkyyXD",
        "",
        "CARA PAKAI:",
        `${prefix}ikyy-text2img <prompt>`,
        "",
        "Contoh:",
        `${prefix}ikyy-text2img kucing lucu bermain di taman`,
      ].join("\n"), "guide"));
    }

    await m.react("🕒");

    const res = await axios.get(`${IKYY_BASE}/ai/text2img`, {
      params: { apikey: "kyzz", text },
      timeout: 120000,
    });

    const data = res.data;
    if (data?.status && data?.result) {
      const resultUrl = typeof data.result === "string" ? data.result : data.result?.url || data.result?.result_url;
      await m.react("🐣");
      await sock.sendMessage(m.chat, {
        image: { url: resultUrl },
        caption: claraWrap("Ikyy Text2Img", `Prompt: ${text}`),
      }, { quoted: m });
    } else {
      await m.react("❌");
      await m.reply(claraWrap("Ikyy Text2Img", data?.error || data?.message || "Gagal generate gambar. Coba lagi nanti."));
    }
  } catch (e) {
    console.error("[ikyy-text2img.js]:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("Ikyy Text2Img", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
