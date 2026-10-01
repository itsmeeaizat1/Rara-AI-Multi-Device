// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Plugin .aicheck — detektor teks AI (port engine lama aicheck.js, originality.ai free)
import { raraGuide, raraError, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "aicheck",
  alias: ["aidetector", "aiorhuman"],
  category: "tools",
  description: "Deteksi kemungkinan teks ditulis AI atau manusia (originality.ai free)",
  usage: ".aicheck <teks>",
  example: ".aicheck <tempel teksnya>",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const ENDPOINT = "https://api.originality.ai/api/v2-tools/free-tools/ai-scan";
const HEADERS = {
  accept: "*/*",
  "accept-language": "id-ID",
  "content-type": "application/json",
  origin: "https://corefreetools.originality.ai",
  referer: "https://corefreetools.originality.ai/",
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
};

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🧠");
    const text = (m.text || "").replace(new RegExp("^" + prefix + "aicheck\\s*", "i"), "").trim();
    if (!text) {
      await m.react("🐣");
      await m.reply(raraGuide(
        "aicheck",
        "Cek kemungkinan sebuah teks ditulis AI atau manusia (originality.ai free tools).",
        prefix + "aicheck <tempel teksnya di sini>",
        "Hasil: persen AI vs manusia. Makin panjang teks makin akurat."
      ));
      return { handled: true };
    }
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ content: text }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const aiPercent = ((data?.ai ?? 0) * 100).toFixed(2);
    const humanPercent = ((data?.original ?? data?.human ?? 0) * 100).toFixed(2);
    await m.react("⚡");
    await m.reply(raraWrap("AI Check", [
      "Teks: *" + text.slice(0, 60) + (text.length > 60 ? "..." : "") + "*",
      "Kemungkinan AI: *" + aiPercent + "%*",
      "Kemungkinan manusia: *" + humanPercent + "%*",
    ].join("\n")));
  } catch (error) {
    console.error("[aicheck]:", error.message);
    await m.react("❌");
    await m.reply(raraError("AI Check", "Gagal: " + String(error.message).slice(0, 120)));
  }
  return { handled: true };
}

export { pluginConfig as config, handler }
