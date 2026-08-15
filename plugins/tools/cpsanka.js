// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "cpsanka",
  alias: ["couplesanka", "cpanimesanka"],
  category: "tools",
  description: "Random anime couple (cowo & cwe) image",
  usage: ".cpsanka",
  example: ".cpsanka",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

const API_BASE = "https://www.sankavollerei.web.id";
const API_KEY = "planaai";

async function handler(m, { sock }) {
  await m.react("🕐");

  try {
    const url = `${API_BASE}/anime/cp?apikey=${API_KEY}`;

    const res = await axios.get(url, {
      timeout: 20000,
      validateStatus: () => true,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (res.status !== 200 || !res.data?.status) {
      throw new Error(res.data?.message || "API error");
    }

    const { cowo_url, cwe_url } = res.data.result;

    // Download both images
    const [cowoRes, cweRes] = await Promise.all([
      axios.get(cowo_url, { responseType: "arraybuffer", timeout: 15000, validateStatus: () => true }),
      axios.get(cwe_url, { responseType: "arraybuffer", timeout: 15000, validateStatus: () => true }),
    ]);

    if (cowoRes.status !== 200 || cweRes.status !== 200) {
      throw new Error("Gagal download gambar");
    }

    const cowoBuf = Buffer.from(cowoRes.data);
    const cweBuf = Buffer.from(cweRes.data);

    // Send cowo image
    await sock.sendMessage(m.chat, {
      image: cowoBuf,
      caption: "Anime Couple (Cowo)",
    }, { quoted: m });

    // Send cwe image
    await sock.sendMessage(m.chat, {
      image: cweBuf,
      caption: "Anime Couple (Cewe)",
    });

    await m.react("✅");
  } catch (e) {
    console.error("[CPSANKA] Error:", e.message);
    let txt = `Gagal mengambil couple image!\n\n`;
    txt += `Error: ${e.message}`;
    await m.reply(claraWrap("cpsanka", txt));
  }
}

export { pluginConfig as config, handler };
