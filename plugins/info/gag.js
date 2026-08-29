// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import te from "../../src/lib/nova-error.js";

import { novaError, novaEmpty, novaGuide, novaNoInput,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "gag",
  alias: ["gag"],
  category: "info",
  description: "Menampilkan informasi stok Grow a Garden",
  usage: ".gag",
  example: ".gag",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const res = await axios.get("https://api.nexray.eu.cc/information/growagarden", {
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });

    const data = res.data;
    if (!data.status || !data.result) {
      return m.reply(novaError("GAG", "Gagal ambil info Grow a Garden nih"));
    }

    const r = data.result;

    const formatStock = (arr, title) => {
      if (!arr || arr.length === 0) return "";
      let txt = `*${title}*\n`;
      arr.forEach(item => {
        txt += `- ${item.name}: ${item.value}\n`;
      });
      return txt + "\n";
    };

    let caption = `🌱 *ɢʀᴏᴡ ᴀ ɢᴀʀᴅᴇɴ ɪɴꜰᴏ* 🌱\n\n`;

    caption += formatStock(r.gearStock, "⚙️ Gear Stock");
    caption += formatStock(r.eggStock, "🥚 Egg Stock");
    caption += formatStock(r.eventStock, "🎟️ Event Stock");
    caption += formatStock(r.cosmeticsStock, "👕 Cosmetics Stock");
    caption += formatStock(r.seedsStock, "🌾 Seeds Stock");
    caption += formatStock(r.merchantsStock, "🏪 Merchants Stock");

    if (r.lastSeen && r.lastSeen.length > 0) {
      caption += `*👀 Last Seen*\n`;
      r.lastSeen.slice(0, 5).forEach(item => {
        caption += `- ${item.name}: ${item.seen}\n`;
      });
    }

    { const __navText = claraWrap(caption.trim().split("\n").filter(l => l.trim())); await m.reply(__navText); };
  } catch (error) {
    console.error("[GAG Info]", error.message);
    m.reply(novaError("GAG", "Ada error nih, coba lagi ya"));
  }
}

export { pluginConfig as config, handler };
