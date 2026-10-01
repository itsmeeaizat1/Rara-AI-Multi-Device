// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/rara-error.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraLine, raraGuideV2 } from "../../src/lib/rara-menu-style.js";
import { callIkyy } from "../../src/lib/rara-ai-service.js";

const pluginConfig = {
  name: "simi",
  alias: ["simi"],
  category: "ai",
  description: "Ngobrol santai bareng SimiSimi",
  usage: ".simi <pesan>",
  example: ".simi Halo Simi!",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ") || m.text?.trim();

  if (!text) {
        return m.reply(raraGuideV2("simi", {
 kaomoji: "(◕ᴗ◕)",
 sapaan: "mau ngobrol apa sama Simi? dia jawab sembarangan lho! (≧◡≦) ♡",
      cara: "ketik apa aja yang mau kamu omongin",
      contoh: `${m.prefix}simi Halo Simi!`,
      spec: ["⚡ energi 1", "⏱ 3dtk", "💸 gratis"],
    }), "simi");
  }
  try {
  await m.react("🕒");
    const apiUrl = `https://api.nexray.eu.cc/ai/simisimi?text=${encodeURIComponent(text)}`;
    const res = await axios.get(apiUrl, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });

    const data = res.data;
    if (!data.status || !data.result) {
      return m.reply(raraWrap("Simi", "⚠️ Simi lagi ngambek, nggak mau balas."));
    }

    await m.reply(data.result);
  } catch (error) {
    // IkyyXD fallback
    try {
      const ikyyReply = await callIkyy(text?.trim() || m.text, {});
      if (ikyyReply) return m.reply(ikyyReply);
    } catch (ikyyErr) {
      console.error("[simi.js] IkyyXD fallback failed:", ikyyErr.message);
    }

    console.error("[SimiSimi]", error.message);
    await m.react("🐣");
    m.reply(raraWrap("simi", "😔 Simi gagal membalas pesanmu."));
  }
}

export { pluginConfig as config, handler };
