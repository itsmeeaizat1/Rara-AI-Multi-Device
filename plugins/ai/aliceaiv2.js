// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// aliceaiv2 — Alice AI v2 (multi-mode: chat, TikTok caption, image gen)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "aliceaiv2", alias: ["aliceaiv2"], aliases: ["aliceaiv2", "aliceaiaiv2"],
  category: "ai", description: "Alice AI v2 — chat, TikTok caption, image generation",
  usage: ".aliceaiv2 <teks/link tiktok/prompt gambar>", example: ".aliceaiv2 hai apa kabar?\n.aliceaiv2 buatkan gambar wanita",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 10, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const text = m.args.join(" ").trim();
    if (!text) return m.reply(claraWrap("aliceaiv2", `Chat, kirim link TikTok, atau minta gambar.\nContoh: ${m.prefix}aliceaiv2 hai apa kabar?\n${m.prefix}aliceaiv2 buatkan gambar kucing`, "guide"));
    await m.react("🕒");
    const regexTikTok = /(https?:\/\/)?(www\.|vm\.|vt\.)?tiktok\.com\/[^\s]+/gi;
    const isTikTok = regexTikTok.test(text);
    const isImageReq = /(gambar|buatkan.*gambar|bikin.*gambar|buat.*gambar)/i.test(text);

    if (isTikTok) {
      const link = text.match(regexTikTok)[0];
      const res = await fetch(`https://www.velyn.biz.id/api/downloader/tiktok?url=${encodeURIComponent(link)}`);
      const json = await res.json();
      if (!json?.status || !json?.data?.no_watermark) return m.reply(claraWrap("aliceaiv2", "Gagal unduh TikTok.", "error"));
      const prompt = `Buatkan caption menarik untuk video TikTok: ${json.data.title || "tanpa judul"}`;
      const aiRes = await fetch(`https://www.velyn.biz.id/api/ai/velyn-1.0-1b?prompt=${encodeURIComponent(prompt)}`);
      const aiJson = await aiRes.json();
      await sock.sendMessage(m.chat, { video: { url: json.data.no_watermark }, caption: aiJson?.result || "" });
    } else if (isImageReq) {
      const res = await fetch(`https://www.velyn.biz.id/api/ai/text2img?prompt=${encodeURIComponent(text)}`);
      if (!res.ok) return m.reply(claraWrap("aliceaiv2", "Gagal generate gambar.", "error"));
      const buffer = Buffer.from(await res.arrayBuffer());
      await sock.sendMessage(m.chat, { image: buffer, caption: `Gambar: ${text}` });
    } else {
      const res = await fetch(`https://www.velyn.biz.id/api/ai/velyn-1.0-1b?prompt=${encodeURIComponent(text)}`);
      const json = await res.json();
      if (!json?.status || !json?.result) return m.reply(claraWrap("aliceaiv2", "Gagal merespons.", "error"));
      await m.reply(json.result);
    }
    await m.react("🐣");
  } catch (e) {
    console.error("aliceaiv2 error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("aliceaiv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
