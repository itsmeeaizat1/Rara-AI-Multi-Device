// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Plugin .pollenai — free AI chat via pollinations.ai (port HIROBOT pollination.js)
import { novaGuide, novaError } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "pollination",
  alias: ["pollen", "freeaichat"],
  category: "ai",
  description: "Chat AI gratis via pollinations.ai dengan ingatan percakapan",
  usage: ".pollenai <pertanyaan> | .pollenai reset",
  example: ".pollenai siapa presiden pertama indonesia",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const sessions = new Map();

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🧠");
    const text = (m.text || "").replace(new RegExp("^" + prefix + "pollenation\\s*", "i"), "").trim();
    if (!text || text.toLowerCase() === "help") {
      await m.react("🐣");
      await m.reply(novaGuide(
        "pollination",
        "Chat AI gratis (pollinations.ai, tanpa key) — ingat percakapan per user.",
        prefix + "pollen jelaskan black hole ke anak smp",
        "Reset ingatan: " + prefix + "pollen reset."
      ));
      return { handled: true };
    }
    if (text.toLowerCase() === "reset") {
      sessions.delete(m.sender);
      await m.react("⚡");
      await m.reply("Riwayat chat pollination kamu udah dihapus.");
      return { handled: true };
    }
    if (!sessions.has(m.sender)) sessions.set(m.sender, []);
    const hist = sessions.get(m.sender);
    hist.push({ role: "user", content: text });
    const res = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json", Referer: "https://pollinations.ai/" },
      body: JSON.stringify({ model: "openai", messages: hist, stream: false }),
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || "(kosong)";
    hist.push({ role: "assistant", content: reply });
    if (hist.length > 20) sessions.set(m.sender, hist.slice(-20));
    await m.react("⚡");
    await m.reply(reply);
  } catch (error) {
    console.error("[pollenai]:", error.message);
    await m.react("❌");
    await m.reply(novaError("Pollination", "Gagal: " + String(error.message).slice(0, 120)));
  }
  return { handled: true };
}

export { pluginConfig as config, handler }
