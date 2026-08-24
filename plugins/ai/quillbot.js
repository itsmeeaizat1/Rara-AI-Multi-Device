// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "quilbot",
  alias: ["quillbot", "parafrasev2", "rewriteai"],
  category: "ai",
  description: "AI Quillbot untuk menulis ulang atau menyempurnakan kalimat",
  usage: ".quilbot <teks>",
  example: ".quilbot Saya sedang makan nasi di rumah",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ") || m.text?.trim();

  if (!text) {
    { const __navText = "❌ Masukkan teks yang ingin disempurnakan.\n\nContoh: `.quilbot Saya sedang makan nasi di rumah`"; return await m.reply(__navText, "quilbot"); };
  }

  await m.react("🕒");

  try {
    const apiUrl = `https://api.nexray.eu.cc/ai/quillbot?text=${encodeURIComponent(text)}`;
    const res = await axios.get(apiUrl, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });

    const data = res.data;
    if (!data.status || !data.result) {
      return m.reply(claraWrap("quilbot", "⚠️ Quillbot gagal memproses teks."));
    }

    await m.reply(data.result);
    await m.react("🐣");

  } catch (error) {
    console.error("[Quillbot]", error.message);
    m.reply(claraWrap("quilbot", "😔 Terjadi kesalahan saat memproses teks ke Quillbot."));
  }
}

export { pluginConfig as config, handler };
