// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 ZelAI Hub — .zel (daftar 86 AI) + .zimage (gambar AI)
// ═════════════════════════════════════════════

import { zelAiChat, zelAiImage, ZEL_AI_REGISTRY, _setZelHttpForTest, _setZelKeyForTest } from "../../src/scraper/zelapi.js";
import { novaWrap, novaGuideV2 } from "../../src/lib/nova-menu-style.js";
import { sendImage } from "../../src/lib/nova-message.js";

const pluginConfig = {
  name: "zelhub",
  alias: ["zel", "zelai", "zimage"],
  category: "ai",
  description: "Daftar 86 AI zelapi.eu.cc + generator gambar AI (prefix z)",
  usage: ".zel list | .zimage <prompt>",
  example: ".zimage kucing astronot lucu",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const cmd = (m.command || "zel").toLowerCase();
    const args = m.args || [];
    const text = args.join(" ").trim();

    if (cmd === "zimage") {
      if (!text) return m.reply(novaGuideV2("zimage", {
 kaomoji: "(◍•ᴗ•◍)",
 sapaan: "generator gambar AI zelapi, deskripsikan aja yang kamu mau!",
        cara: "ketik deskripsi gambar yang mau dibuat",
        contoh: `${m.prefix}zimage kucing astronot lucu`,
        spec: ["⚡ energi 1", "⏱ 15dtk", "💸 gratis"],
      }));
      await m.react("🧠");
      const r = await zelAiImage(text);
      if (!r.ok) {
        await m.react("❌");
        const map = { API_KEY: "⚠️ Key zelapi belum di-set.", TEXT_KOSONG: "⚠️ Prompt kosong." };
        return m.reply(novaWrap("zelai", map[r.error] || `⚠️ *ZIMAGE MATI:* ${r.error}`));
      }
      await m.react("🐣");
      await sendImage(sock, m.chat, r.buffer, `🎨 *(engine: zelapi zimage)_ ${text.slice(0, 80)}`, { quoted: m });
      return;
    }

    // .zel / .zel list
    if (!text || text.toLowerCase() === "list" || text.toLowerCase() === "daftar") {
      const cmds = Object.keys(ZEL_AI_REGISTRY);
      const chat = cmds.filter((c) => ZEL_AI_REGISTRY[c].type !== "image");
      const vision = cmds.filter((c) => ZEL_AI_REGISTRY[c].type === "vision");
      const lines = chat.map((c) => `• .${c} — ${ZEL_AI_REGISTRY[c].desc}`);
      return m.reply(novaWrap("zelai",
        `⚡ *ZELAPI SUITE — ${cmds.length} AI (PREFIX Z)*\n\n` +
        `Semua AI dari zelapi.eu.cc, prefix "z" biar keliatan bedanya. Endpoint mati = error asli keluar (no fallback).\n\n` +
        `📖 *CARA PAKAI:*\n.z<nama> <pesan>\n\n` +
        `📷 *MODE VISION (reply foto + pertanyaan):*\n${vision.map((c) => "." + c).join(" ")}\n\n` +
        `🎨 *GAMBAR AI (22 generator):*\n.zimage <prompt>\n.zimg list (text2img + edit foto)\n\n` +
        `📚 *AI CHAT (${chat.length}):*\n${lines.join("\n")}\n\n` +
        `💡 3 endpoint gak dibikin (butuh kredensial khusus): claude-auto, cloudflare, kikivoice.`));
    }

    // .zel <nama-ai> <pesan> → shortcut
    const target = "z" + args[0].toLowerCase().replace(/^z+/, "").replace(/[\s-]/g, "");
    const rest = args.slice(1).join(" ").trim();
    const spec = ZEL_AI_REGISTRY[target];
    if (!spec) {
      return m.reply(novaWrap("zelai", `⚠️ AI *${args[0]}* gak ada di registry — ketik *.zel list* buat daftar lengkap.`));
    }
    const r = await zelAiChat(target, rest);
    if (!r.ok) { await m.react("❌"); return m.reply(novaWrap("zelai", `⚠️ *${target.toUpperCase()} MATI:* ${r.error}`)); }
    await m.react("🐣");
    return m.reply(novaWrap("zelai", `⚡ *${target.toUpperCase()} (ZELAPI)*\n\n${r.text.slice(0, 3800)}`));
  } catch (err) {
    console.error("[zelhub]", err.message);
    await m.react("❌");
    return m.reply(novaWrap("zelai", `❌ *GAGAL: ${err?.message || "error"}*`));
  }
}

export { pluginConfig as config, handler, _setZelHttpForTest, _setZelKeyForTest };
