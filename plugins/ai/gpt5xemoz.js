// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap, novaGuideV2 } from "../../src/lib/nova-menu-style.js";
import { callIkyy } from "../../src/lib/nova-ai-service.js";

/**
 * plugins/ai/gpt5xemoz.js
 * Command .gpt5xemoz — GPT-5.3 (API xemoz)
 * API: https://api-xemoz-official.my.id/api/ai/gpt-5.3.php
 */

const pluginConfig = {
  name: "gpt5xemoz",
  alias: ["gpt5xemoz"],
  category: "ai",
  description: "GPT-5.3 via API xemoz",
  usage: ".gpt5xemoz <pertanyaan>",
  example: ".gpt5xemoz jelaskan kuantum computing",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const API_URL = "https://api-xemoz-official.my.id/api/ai/gpt-5.3.php";

async function callGPT5(pesan) {
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
    return m.reply(novaGuideV2("gpt5xemoz", {
 kaomoji: "(๑>ᴗ<)و",
 sapaan: "tanya apa aja ke GPT-5.3! ヾ(≧▽≦*)o",
      cara: "kirim pertanyaannya setelah command",
      contoh: `${m.prefix}gpt5xemoz jelaskan kuantum computing`,
      spec: ["⏱ 5dtk", "💸 gratis"],
    }));
  }
  try {
  await m.react("🕒");
    const reply = await callGPT5(text);
    await m.react("🐣");
    return m.reply(novaWrap("GPT-5.3", reply));
  } catch (error) {
    // IkyyXD fallback
    try {
      const ikyyReply = await callIkyy(text?.trim() || m.text, { sessionKey: "satuan:" + m.sender });
      if (ikyyReply) return m.reply(ikyyReply);
    } catch (ikyyErr) {
      console.error("[gpt5xemoz.js] IkyyXD fallback failed:", ikyyErr.message);
    }

    return m.reply(novaWrap("GPT-5.3 Error", error.message || "Gagal hubungin AI nih"));
  }
}

export { pluginConfig as config, handler };
