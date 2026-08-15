// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

/**
 * plugins/ai/gpt5v2xemoz.js
 * Command .gpt5v2xemoz — GPT-5.5 (API xemoz)
 * Beda dari .gpt5 (GPT-4.1 Nano scraper), gak bikin konflik
 * API: https://api-xemoz-official.my.id/api/ai/gpt-5.5.php
 */

const pluginConfig = {
  name: "gpt5v2xemoz",
  alias: ["gpt55xemoz", "gpt5v2"],
  category: "ai",
  description: "GPT-5.5 via API xemoz",
  usage: ".gpt5v2xemoz <pertanyaan>",
  example: ".gpt5v2xemoz jelaskan kuantum computing",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const API_URL = "https://api-xemoz-official.my.id/api/ai/gpt-5.5.php";

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
  if (!reply) throw new Error("Response AI kosong.");

  return typeof reply === "string" ? reply : JSON.stringify(reply, null, 2);
}

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();

  if (!text) {
    const help = `Kirim pertanyaan setelah command.\nContoh: .gpt5v2xemoz jelaskan kuantum computing`;
    return sendReplyWithNav(m, sock, claraWrap("GPT-5.5", help));
  }

  await m.react("🕐");

  try {
    const reply = await callGPT5(text);
    await m.react("✅");
    return m.reply(claraWrap("GPT-5.5", reply));
  } catch (error) {
    await m.react("✅");
    return m.reply(claraWrap("GPT-5.5 Error", error.message || "Gagal menghubungi AI."));
  }
}

export { pluginConfig as config, handler };
