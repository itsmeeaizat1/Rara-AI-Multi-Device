// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// photiu — Generate gambar dari teks via Photiu AI (IkyyXD)
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "photiu",
  alias: ["photiu"],
  category: "ai image",
  description: "Generate gambar dari teks via Photiu AI",
  usage: ".photiu <prompt>",
  example: ".photiu kucing astronot di bulan\n.photiu pemandangan kota futuristik",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 20, energi: 3, isEnabled: true,
};

const IKYY_BASE = "https://api.ikyyxd.my.id";

async function handler(m, { sock }) {
  try {
    const prefix = m.prefix || ".";
    const text = m.text?.trim() || m.args?.join(" ").trim() || "";

    if (!text) {
      return m.reply(claraWrap("Photiu", [
        "Generate gambar dari teks via Photiu AI",
        "",
        "CARA PAKAI:",
        `${prefix}photiu <prompt>`,
        "",
        "Contoh:",
        `${prefix}photiu kucing astronot di bulan`,
      ].join("\n"), "guide"));
    }

    await m.react("🕒");

    const res = await axios.get(`${IKYY_BASE}/ai/photiu`, {
      params: { prompt: text },
      timeout: 120000,
    });

    const data = res.data;
    if (data?.status && data?.result) {
      const resultUrl = typeof data.result === "string" ? data.result : data.result?.url || data.result?.result_url;
      await m.react("🐣");
      await sock.sendMessage(m.chat, {
        image: { url: resultUrl },
        caption: claraWrap("Photiu", `Prompt: ${text}`),
      }, { quoted: m });
    } else {
      await m.react("❌");
      await m.reply(claraWrap("Photiu", data?.message || data?.error || "Gagal generate gambar. Coba prompt lain."));
    }
  } catch (e) {
    console.error("[photiu.js]:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("Photiu", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
