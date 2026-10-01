// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// plugins/ai/spicychat.js — SpicyChat AI: chat karakter "Wormgpt"
// (asistan tanpa sensor) via prod.nd-api.com, guest tanpa API key.
// Multi-turn per-user (session persist db), auto-reset pas expired.
//
// .spicychat <pesan>      — chat
// .spicychat reset        — session baru (lupa semua konteks)
// .spicychat history      — lihat riwayat percakapan
// .spicychat status       — info session

import { spicyChat, spicyGetMessages, extractReply, getEngine, resetSession, getSession } from "../../src/scraper/spicychat.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "spicychat",
  alias: ["spicychat", "spicy", "wormgpt", "auncensored"],
  category: "ai",
  description: "Chat AI karakter tanpa sensor (Wormgpt) — gratis tanpa API key, inget konteks per-user",
  usage: ".spicychat <pesan>\n.spicychat reset — mulai session baru\n.spicychat history — riwayat chat\n.spicychat status — info session",
  example: ".spicychat apa itu wormgpt?",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const sub = (m.args?.[0] || "").toLowerCase();
    const text = m.text?.trim();

    // .spicychat status
    if (sub === "status" && !text.slice(7).trim()) {
      const s = getSession(m.sender);
      return m.reply(raraWrap("spicychat",
        `🤖 SpicyChat AI (Wormgpt) — asisten tanpa sensor\n\n` +
        `⏱️ Session : ${s.conversationId ? "aktif (multi-turn)" : "baru (belum chat)"}\n` +
        `💬 Percakapan : ${s.conversationId ? "tersambung" : "belum ada"}\n\n` +
        `.spicychat <pesan> untuk mulai chat\n.spicychat reset untuk session baru`, "guide"));
    }

    // .spicychat reset
    if (sub === "reset" && text.toLowerCase().replace(/\s+/g, " ").split(" ").length === 1) {
      resetSession(m.sender);
      await m.react("🐣");
      return m.reply(raraWrap("spicychat",
        `✅ Session baru dibuat!\n\nWormgpt sudah lupa semua konteks sebelumnya.\nMulai chat lagi: .spicychat <pesan>`, "success"));
    }

    // .spicychat history
    if (sub === "history") {
      await m.react("⏲️");
      try {
        const data = await spicyGetMessages(m.sender, 20);
        const msgs = Array.isArray(data?.messages) ? data.messages : [];
        if (!msgs.length) {
          return m.reply(raraWrap("spicychat", "Belum ada riwayat percakapan. Chat dulu: .spicychat <pesan>", "guide"));
        }
        let out = "";
        out += `📜 Riwayat chat Wormgpt (${msgs.length} pesan terakhir)\n`;
        out += `\n`;
        for (const msg of msgs) {
          const who = msg?.role === "bot" ? "🤖 Wormgpt" : "👤 Kamu";
          const content = String(msg?.content || "").slice(0, 500);
          out += `${who}: ${content}\n\n`;
        }
        await m.react("🐣");
        return m.reply(raraWrap("spicychat", out.trim(), "guide"));
      } catch (err) {
        return m.reply(raraWrap("spicychat", err.message, "warn"));
      }
    }

    // chat
    const message = text;
    if (!message) {
      return m.reply(raraWrap("spicychat",
        `Mau chat apa?\n\n` +
        `.spicychat <pesan> — chat dengan Wormgpt (tanpa sensor)\n` +
        `.spicychat reset — session baru\n` +
        `.spicychat history — riwayat\n` +
        `.spicychat status — info session\n\n` +
        `Contoh: ${m.prefix}spicychat apa itu wormgpt?`, "guide"));
    }

    await m.react("⏲️");
    const data = await spicyChat(m.sender, message);
    const reply = extractReply(data);
    if (!reply) throw new Error("balasan AI kosong");

    await m.react("🐣");
    const engine = getEngine(data);
    return m.reply(reply + (engine ? `\n\n⚡ ${engine}` : ""));
  } catch (err) {
    console.error("spicychat error:", err.message);
    await m.react("❌");
    return m.reply(raraWrap("spicychat",
      err?.message?.includes("balasan AI kosong")
        ? te(m.prefix, m.command, m.pushName)
        : `API SpicyChat lagi bermasalah: ${err.message}\n\nCoba lagi sebentar, atau .spicychat reset kalau masih error.`,
      "error"));
  }
}

export { pluginConfig as config, handler };
