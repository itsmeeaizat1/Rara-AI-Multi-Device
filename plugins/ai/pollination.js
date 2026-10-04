// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Plugin .pollenai — free AI chat via pollinations.ai (port engine lama pollination.js)
import { raraGuide, raraError, raraWrap } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

const pluginConfig = {
  name: "pollination",
  alias: ["pollen", "freeaichat", "pollenimg"],
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
    // .pollenimg <prompt> — IMAGE GEN via image.pollinations.ai (gratis tanpa key)
    if (/^\.\w*pollenimg/i.test(m.text || "")) {
      const prompt = (m.text || "").replace(new RegExp("^" + prefix + "pollenimg\\s*", "i"), "").trim();
      if (!prompt) {
        await m.react("🐣");
        await m.reply(raraGuide(
          "pollenimg",
          "Bikin gambar AI gratis via pollinations.ai (tanpa key).",
          prefix + "pollenimg kucing astronot gaya cat air",
          "Opsi: --ar 1024x1024 (default) atau --ar 768x1344 buat portrait."
        ));
        return { handled: true };
      }
      let size = "1024x1024";
      const arMatch = prompt.match(/--ar\s+(\d{2,4})x(\d{2,4})/i);
      let cleanPrompt = prompt;
      if (arMatch) { size = arMatch[1] + "x" + arMatch[2]; cleanPrompt = prompt.replace(/--ar\s+\d{2,4}x\d{2,4}/i, "").trim(); }
      const [w, h] = size.split("x");
      const url = "https://image.pollinations.ai/prompt/" + encodeURIComponent(cleanPrompt) + "?width=" + w + "&height=" + h + "&nologo=true";
      const res = await fetch(url, { signal: AbortSignal.timeout(180000) });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      await m.react("⚡");
      let polCaption = raraWrap("PollenImg", cleanPrompt.slice(0, 100));
      try {
        const info = await probeBuffer(buf);
        const card = mediaResultCard({
          header: "pollination",
          request: [["Model", "Pollination"], ["Prompt", String(cleanPrompt).slice(0, 80)]],
          size: info.size, mime: info.mime, width: info.width, height: info.height,
        });
        if (card) polCaption = card;
      } catch {}
      await sock.sendMessage(m.chat, { image: buf, caption: polCaption }, { quoted: m });
      return { handled: true };
    }
    const text = (m.text || "").replace(new RegExp("^" + prefix + "pollination\\s*", "i"), "").trim();
    if (!text || text.toLowerCase() === "help") {
      await m.react("🐣");
      await m.reply(raraGuide(
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
    await m.reply(raraError("Pollination", "Gagal: " + String(error.message).slice(0, 120)));
  }
  return { handled: true };
}

export { pluginConfig as config, handler }
