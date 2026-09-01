// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// yuprav2 — AI chat v2 (Pollinations API — free, no key)
import { novaReply } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "yuprav2",
  alias: ["yuprav2", "yupraaiv2"],
  category: "ai",
  description: "AI chat v2 (Pollinations — free, no API key)",
  usage: ".yuprav2 <pertanyaan>",
  example: ".yuprav2 apa itu AI",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) {
      const msg = novaReply({
        title: "AI V2",
        status: "Masukkan pertanyaan untuk AI",
        content: "|\n| Contoh: " + m.prefix + "yuprav2 apa itu AI",
      });
      return await m.reply(msg);
    }

    await m.react("🕒");

    const res = await fetch(
      "https://text.pollinations.ai/" + encodeURIComponent(text),
      { headers: { "User-Agent": "Mozilla/5.0" } },
    );

    const answer = await res.text();

    if (!answer || answer.startsWith("<")) {
      const msg = novaReply({
        title: "AI V2",
        status: "AI sedang tidak merespons, coba lagi nanti",
      });
      return await m.reply(msg);
    }

    await m.reply(answer.trim());
    await m.react("🐣");
  } catch (e) {
    console.error("yuprav2 error:", e.message);
    await m.react("❌");
    const msg = novaReply({
      title: "AI V2",
      status: "Error: " + e.message,
    });
    await m.reply(msg);
  }
}

export { pluginConfig as config, handler };
