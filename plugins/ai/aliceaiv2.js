// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// aliceaiv2 — Alice AI v2 (multi-mode: chat, TikTok caption, image gen)
// API asli (velyn.biz.id) udah mati → chat lewat rantai fallback multi-API
// (rara-ai-fallback.js: Haidar → Ikyy → Xemoz), image gen via callIkyyImage,
// link TikTok diarahkan ke downloader .tiktok yang udah hidup.
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
import te from "../../src/lib/rara-error.js";
import { callIkyyImage } from "../../src/lib/rara-ai-service.js";
import { aiFallbackChat } from "../../src/lib/rara-ai-fallback.js";

const pluginConfig = {
  name: "aliceaiv2", alias: ["aliceaiv2"], aliases: ["aliceaiv2", "aliceaiaiv2"],
  category: "ai", description: "Alice AI v2 — chat, TikTok caption, image generation",
  usage: ".aliceaiv2 <teks/link tiktok/prompt gambar>", example: ".aliceaiv2 hai apa kabar?\n.aliceaiv2 buatkan gambar wanita",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 10, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ").trim();
  if (!text) return m.reply(raraWrap("aliceaiv2", `Chat, atau minta gambar.\nContoh: ${m.prefix}aliceaiv2 hai apa kabar?\n${m.prefix}aliceaiv2 buatkan gambar kucing\n\nLink TikTok? Pakai ${m.prefix}tiktok aja ya — downloadernya siap.`, "guide"));
  try {
    await m.react("🕒");
    const isTikTok = /(https?:\/\/)?(www\.|vm\.|vt\.)?tiktok\.com\/[^\s]+/i.test(text);
    const isImageReq = /(gambar|buatkan.*gambar|bikin.*gambar|buat.*gambar)/i.test(text);

    if (isTikTok) {
      return m.reply(raraWrap("aliceaiv2", `Untuk link TikTok pakai ${m.prefix}tiktok <link> ya — downloadernya lebih lengkap (video/foto/slide).`, "guide"));
    }

    if (isImageReq) {
      const imgUrl = await callIkyyImage(text, "1:1");
      if (!imgUrl) throw new Error("gagal generate gambar");
      let caption = `Gambar: ${text}`;
      try {
        const info = await probeMedia(imgUrl);
        const card = mediaResultCard({
          header: "aliceai",
          request: [["Model", "Alice AI"], ["Teks", String(text).slice(0, 80)]],
          size: info.size, mime: info.mime,
        });
        if (card) caption = card;
      } catch {}
      await sock.sendMessage(m.chat, { image: { url: imgUrl }, caption });
    } else {
      const reply = await aiFallbackChat(text, { persona: "Alice AI — asisten WhatsApp yang ramah dan ceria" , sessionKey: "satuan:" + m.sender, quoted: m.quoted?.text, userName: m.pushName});
      if (!reply) throw new Error("balasan AI kosong");
      await m.reply(reply);
    }
    await m.react("🐣");
  } catch (e) {
    console.error("aliceaiv2 error:", e.message);
    await m.react("❌");
    return m.reply(raraWrap("aliceaiv2", te(m.prefix, m.command, m.pushName, e), "error"));
  }
}
export { pluginConfig as config, handler };
