// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, novaGuideV2 } from "../../src/lib/nova-menu-style.js";
import { callIkyy } from "../../src/lib/nova-ai-service.js";

/**
 * plugins/ai/deepseekv2.js
 * Command .deepseekv2 — DeepSeek v3.2 Thinking (API xemoz)
 * Terpisah dari .deepseek (V4), gak bikin konflik
 * API: https://api-xemoz-official.my.id/api/ai/deepseek-v3.2-thinking.php
 */

const pluginConfig = {
  name: "deepseekv2",
  alias: ["deepseekv2"],
  category: "ai",
  description: "DeepSeek v3.2 Thinking via API xemoz",
  usage: ".deepseekv2 <pertanyaan>",
  example: ".deepseekv2 jelaskan black hole",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const API_URL = "https://api-xemoz-official.my.id/api/ai/deepseek-v3.2-thinking.php";

async function callDeepSeekV2(pesan) {
  const url = `${API_URL}?${new URLSearchParams({ pesan })}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(60000),
  });

  let data;
  try { data = await res.json(); } catch {
    throw new Error("Response server tidak dapat dibaca.");
  }

  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

  const reply = data?.result?.reply || data?.response || data?.result || "";
  if (!reply) throw new Error("AI balas kosong nih");

  return typeof reply === "string" ? reply : JSON.stringify(reply, null, 2);
}

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();

  if (!text) {
    return m.reply(novaGuideV2("deepseekv2", {
 kaomoji: "(◍'◡'◍)",
 sapaan: "ngobrol sama DeepSeek v3.2, si jenius matematika! (◕ᴗ◕)",
      cara: "kirim pertanyaannya setelah command",
      contoh: `${m.prefix}deepseekv2 jelaskan black hole`,
      spec: ["⏱ 5dtk", "💸 gratis"],
    }));
  }
  try {
  await m.react("🕒");
    const reply = await callDeepSeekV2(text);
    await m.react("🐣");
    return m.reply(claraWrap("DeepSeek v3.2", reply));
  } catch (error) {
    // IkyyXD fallback
    try {
      const ikyyReply = await callIkyy(text?.trim() || m.text, { sessionKey: "satuan:" + m.sender });
      if (ikyyReply) return m.reply(ikyyReply);
    } catch (ikyyErr) {
      console.error("[deepseekv2.js] IkyyXD fallback failed:", ikyyErr.message);
    }

    return m.reply(claraWrap("DeepSeek v3.2 Error", error.message || "Gagal hubungin AI nih"));
  }
}

export { pluginConfig as config, handler };
