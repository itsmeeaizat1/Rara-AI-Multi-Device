// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const REACTION_MAP = {
  animereact: "waifu", animehug: "hug", animekiss: "kiss", animecry: "cry",
  animeblush: "blush", animepat: "pat", animeslap: "slap", animewave: "wave",
  animehappy: "happy", animenom: "nom", animebite: "bite", animedance: "dance",
  animepoke: "poke", animehandhold: "handhold", animewink: "wink",
};

const REACTION_LABELS = {
  hug: "peluk", kiss: "cium", cry: "nangis", blush: "salting",
  pat: "belai", slap: " tampar", wave: "sapa", happy: "senang",
  nom: "nom", bite: "gigit", dance: "joget", poke: "colok",
  handhold: "genggam tangan", wink: "kedip", waifu: "waifu",
};

const pluginConfig = {
  name: "animereact",
  alias: ["animereact", "animehug", "animekiss", "animecry", "animeblush", "animepat", "animeslap", "animewave", "animehappy", "animenom", "animebite", "animedance", "animepoke", "animehandhold", "animewink"],
  category: "anime",
  description: "Anime reaction GIF/image (hug, kiss, cry, blush, dll)",
  usage: ".animehug @tag (atau .animekiss, .animecry, dll)",
  example: ".animehug @628xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const cmd = m.command || "animereact";
    const type = REACTION_MAP[cmd] || "waifu";
    const label = REACTION_LABELS[type] || type;

    await m.react("🕒");
    const { data } = await axios.get(`https://waifu.pics/api/sfw/${type}`, {
      timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!data || !data.url) {
      await m.react("❌");
      return m.reply(claraWrap("animereact", "Gagal ambil anime reaction. Coba lagi.", "error"));
    }

    const imgRes = await axios.get(data.url, {
      responseType: "arraybuffer", timeout: 30000, headers: { "User-Agent": "Mozilla/5.0" },
    });
    const buffer = Buffer.from(imgRes.data);

    let target = "";
    let mentions = [];
    if (m.mentionedJid && m.mentionedJid.length > 0) {
      target = `@${m.mentionedJid[0].split("@")[0]}`;
      mentions = m.mentionedJid;
    } else {
      target = "seseorang";
    }

    await m.react("🐣");
    const senderName = m.pushName || "kamu";
    const caption = `╭─「 *ᴀɴɪᴍᴇ ʀᴇᴀᴄᴛɪᴏɴ* 」\n│ ${senderName} ${label} ${target} 💕\n╰──────────`;
    return await sock.sendMessage(m.chat, { image: buffer, caption, mentions });
  } catch (err) {
    console.error("animereact error:", err);
    await m.react("❌");
    return m.reply(claraWrap("animereact", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
