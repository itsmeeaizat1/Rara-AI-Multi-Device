// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

/**
 * plugins/ai/deepseekv2.js
 * Command .deepseekv2 — DeepSeek v3.2 Thinking (API xemoz)
 * Terpisah dari .deepseek (V4), gak bikin konflik
 * API: https://api-xemoz-official.my.id/api/ai/deepseek-v3.2-thinking.php
 */

const pluginConfig = {
  name: "deepseekv2",
  alias: ["dsv2", "ds32", "deepseekv3.2"],
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
  if (!reply) throw new Error("Response AI kosong.");

  return typeof reply === "string" ? reply : JSON.stringify(reply, null, 2);
}

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();

  if (!text) {
    const help = `Kirim pertanyaan setelah command.\nContoh: .deepseekv2 jelaskan black hole`;
    return sendReplyWithNav(m, sock, claraWrap("DeepSeek v3.2", help));
  }

  await m.react("🕐");

  try {
    const reply = await callDeepSeekV2(text);
    await m.react("✅");
    return m.reply(claraWrap("DeepSeek v3.2", reply));
  } catch (error) {
    await m.react("✅");
    return m.reply(claraWrap("DeepSeek v3.2 Error", error.message || "Gagal menghubungi AI."));
  }
}

export { pluginConfig as config, handler };
