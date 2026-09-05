// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
import { callIkyy } from "../../src/lib/nova-ai-service.js";

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
    { const __navText = "❌ Mau ngobrol apa sama Simi?\n\n💡 *Contoh:* `.simi Halo Simi!`"; return await m.reply(__navText, "simi"); };
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
      return m.reply(claraWrap("Simi", "⚠️ Simi lagi ngambek, nggak mau balas."));
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
    m.reply(claraWrap("simi", "😔 Simi gagal membalas pesanmu."));
  }
}

export { pluginConfig as config, handler };
