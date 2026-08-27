// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

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

  await m.react("🕒");

  try {
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
    await m.react("🐣");

  } catch (error) {
    console.error("[SimiSimi]", error.message);
    m.reply(claraWrap("simi", "😔 Simi gagal membalas pesanmu."));
  }
}

export { pluginConfig as config, handler };
