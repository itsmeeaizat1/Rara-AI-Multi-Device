// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// inworldchat.js — Inworld AI: LLM chat via Realtime Router (platform.inworld.ai).
// Model langsung format "provider/model" — OpenAI-compatible endpoint.
// Default openai/gpt-5.4-nano (verifikasi live: cepat & murah). Bebas ganti model
// lewat argumen, contoh .inworldchat gemini-3.1-pro|<teks> (tulis id model lengkap
// misal google-ai-studio/gemini-3.1-pro-preview kalau udah punya billing).
// Key: .setkey inworld <key> (sama dengan .inworldtts).
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { inworldChat, getInworldKey } from "../../src/lib/rara-inworld.js";

const pluginConfig = {
  name: "inworldchat",
  alias: ["inworldchat", "inwchat"],
  category: "ai",
  description: "Chat AI via Inworld Router — akses ratusan model LLM (OpenAI, Anthropic, Google, dll) lewat satu key",
  usage: ".inworldchat <teks> · .inworldchat <model>|<teks>",
  example: ".inworldchat jelaskan black hole ke anak smp · .inworldchat openai/gpt-5.4-nano|halo",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 5,
  isEnabled: true,
};

async function handler(m) {
  const args = m.args || [];
  const text = args.join(" ").trim();

  if (!getInworldKey()) {
    return m.reply(raraWrap("Inworld AI", "API key Inworld belum di-set.\n\nCara: .setkey inworld <key>\nAmbil key: https://platform.inworld.ai/api-keys"));
  }
  if (!text) {
    return m.reply(raraWrap("Inworld AI",
      "Chat AI via Inworld — satu key, ratusan model frontier.\n\n" +
      "Format:\n" +
      "• .inworldchat <teks>\n" +
      "• .inworldchat <model>|<teks>\n\n" +
      "Contoh:\n" +
      "• .inworldchat buatkan rencana belajar 3 hari sebelum ujian\n" +
      "• .inworldchat anthropic/claude-haiku-4-5-20251001|ringkas berita hari ini"));
  }

  try {
    let model = "";
    let prompt = text;
    if (text.includes("|")) {
      const [mv, ...rest] = text.split("|");
      const candidate = String(mv).trim();
      // cuma dianggap model kalau ada "provider/model" atau mengandung tanda /
      if (candidate && candidate.includes("/")) {
        model = candidate;
        prompt = rest.join("|").trim();
      }
    }
    if (!prompt) return m.reply(raraWrap("Inworld AI", "Teksnya kosong setelah nama model — format: .inworldchat <model>|<teks>"));
    const res = await inworldChat({ model: model || undefined, messages: [{ role: "user", content: prompt }] });
    const footer = res?.model ? `\n\n🧠 model: ${res.model}` : "";
    await m.reply(res.content + footer);
  } catch (e) {
    m.reply(raraWrap("Inworld AI", String(e?.message || e), "error"));
  }
}

export { pluginConfig as config, handler };
