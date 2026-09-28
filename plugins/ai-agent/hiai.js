// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Plugin .hiai — AI agent framework MCP port dari HIROBOT (engine src/lib/hiroai/)
// Nama cmd SENGAJA beda dari agent Nova (.novaagent/.mcp/.ai lain) biar gak bentrok.
import { novaGuide, novaError, claraWrap, tipText } from "../../src/lib/nova-menu-style.js";
import { runAgent, resetSession, listTools, countTools, MODELS, getApiKeys, setContext } from "../../src/lib/hiroai/mcp.js";
import { AIRich } from "../../src/lib/nova-airich-hiro.js";

const pluginConfig = {
  name: "hiai",
  alias: ["hiroai", "hiagent"],
  category: "ai-agent",
  description: "AI agent MCP Hiro — chat AI dengan tool aktif (grup, media, web, database, pengingat)",
  usage: ".hiai <tugas> | .hiai reset | .hiai tools | .hiai info | .hiai models",
  example: ".hiai carikan berita tekno hari ini lalu rangkum",
  isOwner: true,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🧠");
    const raw = m.text?.trim() || "";
    const bodyText = raw.replace(new RegExp(`^${prefix}hiai\\s*`, "i"), "").trim();
    const arg = raw.replace(new RegExp(`^${prefix}hiai\\s+`, "i"), "").trim().toLowerCase();

    // subcommand
    if (!bodyText || arg === "help" || arg === "menu") {
      await m.react("🐣");
      await m.reply(novaGuide(
        "hiai",
        "AI agent MCP port dari HIROBOT — AI bisa pakai tool: kelola grup, kirim pesan, baca chat, web, database, pengingat, media, sistem.",
        `${prefix}hiai buatkan grup baru bernama Tes Agent`,
        `Sub: ${prefix}hiai reset (reset sesi) · ${prefix}hiai tools (daftar tool) · ${prefix}hiai info (status) · ${prefix}hiai models. Beda dari .novaagent (agent internal Nova).`
      ));
      return { handled: true };
    }

    if (arg === "tools") {
      const tools = listTools();
      const lines = tools.slice(0, 40).map((t) => `- ${t.name}: ${String(t.description || "").slice(0, 80)}`);
      await m.react("⚡");
      await m.reply(claraWrap("HIAI Tools Aktif", [
        `Total: *${countTools()}* tool`,
        "",
        ...lines,
        tools.length > 40 ? `... dan ${tools.length - 40} lagi` : "",
      ].join("\n")));
      return { handled: true };
    }

    if (arg === "models") {
      const names = Object.keys(MODELS || {});
      await m.react("⚡");
      await m.reply(claraWrap("HIAI Models", names.length ? names.map((n) => `- ${n}`).join("\n") : "MODELS kosong"));
      return { handled: true };
    }

    if (arg === "info") {
      const keys = getApiKeys();
      await m.react("⚡");
      await m.reply(claraWrap("HIAI Status", [
        `Engine: *HIROBOT MCP port* (src/lib/hiroai/)`,
        `Tools terpasang: *${countTools()}*`,
        `API keys (env AI_KEYS): *${keys.length}*`,
        keys.length ? "" : "Belum ada key — set env AI_KEYS (Gemini API key, bisa multiple dipisah koma) lalu restart bot.",
      ].filter(Boolean).join("\n")));
      return { handled: true };
    }

    if (arg === "reset") {
      resetSession(m.sender);
      await m.react("⚡");
      await m.reply(claraWrap("HIAI Reset", "Sesi percakapan agent kamu sudah direset."));
      return { handled: true };
    }

    // agent utama
    setContext({
      conn: sock,
      m,
      jid: m.chat,
      isOwner: true,
      isROwner: true,
      timezone: "Asia/Jakarta",
    });

    const result = await runAgent(sock, m, bodyText, {});
    if (result?.type === "message" && (await renderRichResult(sock, m, result))) {
      await m.react("⚡");
      return { handled: true };
    }
    if (result?.type === "confirm" || result?.type === "error") {
      const t = result?.text || "";
      await m.react(result?.type === "error" ? "❌" : "⚡");
      if (t) await m.reply(t);
      return { handled: true };
    }
    const text = result?.text || result?.message || "";
    if (!text) {
      await m.react("❌");
      await m.reply(novaError("HIAI", "Agent gak balas apa-apa — cek env AI_KEYS terisi (.hiai info) lalu coba lagi"));
      return { handled: true };
    }
    await m.react("⚡");
    await m.reply(text);
  } catch (error) {
    console.error("[hiai]:", error.message);
    await m.react("❌");
    await m.reply(novaError("HIAI", `Gagal: ${String(error.message).slice(0, 120)}`));
  }

  return { handled: true };
}

// ── AI RICH RENDER (port ai.js HIROBOT 29 Sep): jawaban agent bertipe message ──
// codeblock → kartu GenAI native (sock.aiRich: title + teks hyperlink + code tersorot),
// buttons → nativeFlow WhatsApp (url/copy/reply), semuanya fallback teks biasa kalau
// channel/baileys gak dukung. return true kalau udah dirender (handler berhenti di sini).
export async function renderRichResult(sock, m, result) {
  const d = result?.messageData || {};
  if (result?.messageType === "codeblock") {
    try {
      const rich = (typeof sock?.aiRich === "function" ? sock.aiRich() : new AIRich(sock));
      if (d.title) rich.setTitle(d.title);
      if (d.description) rich.addText(`${d.description}\n`, { hyperlink: true });
      rich.addCode(d.language || "text", d.code || "");
      await rich.send(m.chat, { quoted: m });
      return true;
    } catch (e) {
      console.error("[hiai] aiRich gagal, fallback teks:", e.message);
      let msg = "";
      if (d.title) msg += `*${d.title}*\n\n`;
      if (d.description) msg += `${d.description}\n\n`;
      msg += "```" + (d.language || "text") + "\n" + (d.code || "") + "\n```";
      await m.reply(msg);
      return true;
    }
  }
  if (result?.messageType === "buttons") {
    try {
      const btns = (d.buttons || []).map((btn) => {
        const type = (btn.type || "reply").toLowerCase();
        if (type === "url") return { text: btn.label || "Link", url: btn.value || "", useWebview: true };
        if (type === "copy") return { text: btn.label || "Copy", copy: btn.value || "" };
        return { text: btn.label || "Button", id: btn.value || "" };
      });
      const msg = { text: d.body || "", nativeFlow: btns };
      if (d.footer) msg.footer = d.footer;
      await sock.sendMessage(m.chat, msg, { quoted: m });
      return true;
    } catch (e) {
      console.error("[hiai] nativeFlow gagal, fallback teks:", e.message);
      const lines = [d.body || ""];
      if (d.footer) lines.push(`_${d.footer}_`);
      (d.buttons || []).forEach((b) => lines.push(`• ${b.label}: ${b.value}`));
      await m.reply(lines.join("\n"));
      return true;
    }
  }
  return false;
}

export { pluginConfig as config, handler }
