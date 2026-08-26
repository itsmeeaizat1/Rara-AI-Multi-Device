// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "fakechat",
  alias: ["fakechat"],
  category: "fun",
  description: "Generator fake chat WhatsApp lucu untuk prank/meme",
  usage: ".fakechat <nama>|<pesan> — Bikin fake chat\n.fakechat <nama>|<pesan>|<jam> — Custom jam",
  example: ".fakechat Budi|Bro kamu ganteng banget\n.fakechat Siti|Aku lapar|14:30",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = text || args.join(" ");

    if (!input || !input.includes("|")) {
      return m.reply(claraWrap("Fake Chat", [
        "FAKE CHAT WHATSAPP",
        "Format: nama|pesan",
        "Format+jam: nama|pesan|jam",
        "",
        "Contoh: " + usedPrefix + "fakechat Budi|Bro kamu ganteng",
        "Contoh: " + usedPrefix + "fakechat Siti|Aku laper|14:30",
        "",
        "Teks di-buat jadi fake chat WhatsApp lucu",
      ], "info"));
    }

    const parts = input.split("|");
    const nama = parts[0]?.trim() || "Anonim";
    const pesan = parts[1]?.trim() || "???";
    let jam = parts[2]?.trim();

    if (!jam) {
      const now = new Date();
      jam = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
    }

    const online = Math.random() > 0.5 ? "online" : "last seen today";
    const tick = Math.random() > 0.3 ? "✓✓" : "✓";

    const chatText = [
      "╭── 「 FAKE CHAT 」",
      "│",
      "│  " + nama,
      "│  " + online,
      "│",
      "├─────────────────────",
      "│",
      "│  ┌─────────────────┐",
      "│  │ " + pesan,
      "│  └─────────────────┘",
      "│              " + jam + " " + tick,
      "│",
      "│  ┌─────────────────┐",
      "│  │ (balasan akan muncul di sini)",
      "│  └─────────────────┘",
      "│  " + jam + " " + tick,
      "│",
      "╰── 「 NOVA AI 」",
    ].join("\n");

    return m.reply("```" + chatText + "```");
  } catch (e) {
    return m.reply(claraWrap("Fake Chat", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
