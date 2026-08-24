// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

/**
 * plugins/ai/gpt5xemoz.js
 * Command .gpt5xemoz — GPT-5.3 (API xemoz)
 * API: https://api-xemoz-official.my.id/api/ai/gpt-5.3.php
 */

const pluginConfig = {
  name: "gpt5xemoz",
  alias: ["gpt53xemoz", "gpt5xemz"],
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
  if (!reply) throw new Error("Response AI kosong.");

  return typeof reply === "string" ? reply : JSON.stringify(reply, null, 2);
}

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();

  if (!text) {
    const help = `Kirim pertanyaan setelah command.\nContoh: .gpt5xemoz jelaskan kuantum computing`;
    return m.reply( claraWrap("GPT-5.3", help));
  }

  await m.react("🕒");

  try {
    const reply = await callGPT5(text);
    await m.react("✅");
    return m.reply(claraWrap("GPT-5.3", reply));
  } catch (error) {
    await m.react("✅");
    return m.reply(claraWrap("GPT-5.3 Error", error.message || "Gagal menghubungi AI."));
  }
}

export { pluginConfig as config, handler };
