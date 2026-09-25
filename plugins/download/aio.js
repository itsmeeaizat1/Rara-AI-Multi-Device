// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// aio — All in one downloader
// Primary: IkyyXD all-in-one | Fallback: builtin aiodl scraper
import { ikyyAio } from "../../src/scraper/ikyydl.js";
import { aiodl } from "../../src/scraper/aio.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import { novaError, novaEmpty, novaGuide, novaGuideV2, novaNoInput, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";

// Caption builder LOKAL (bukan shared lib — owner: tiap fitur punya sendiri, 14 Sep 2026)
function mediaCaption({
  platformIcon = "📥",
  platformName = "Download",
  title, author, authorHandle, duration, uploadDate,
  views, likes, comments, shares, downloads, subscribers,
  description, format, method,
} = {}) {
  const lines = [];
  if (title) lines.push(`Title: ${String(title).slice(0, 80)}`);
  let authorStr = "";
  if (author && authorHandle) authorStr = `${author} (@${authorHandle})`;
  else if (author) authorStr = String(author);
  else if (authorHandle) authorStr = `@${authorHandle}`;
  if (authorStr) lines.push(`Author: ${authorStr}`);
  if (duration) lines.push(`Duration: ${String(duration)}`);
  if (uploadDate) lines.push(`Upload: ${String(uploadDate)}`);
  if (views) lines.push(`Views: ${String(views)}`);
  if (likes) lines.push(`Likes: ${String(likes)}`);
  if (comments) lines.push(`Comments: ${String(comments)}`);
  if (shares) lines.push(`Shares: ${String(shares)}`);
  if (downloads) lines.push(`Downloads: ${String(downloads)}`);
  if (subscribers) lines.push(`Subs: ${String(subscribers)}`);
  if (description && String(description).trim()) {
    lines.push(`Desc: ${String(description).trim().slice(0, 120)}`);
  }
  if (format) lines.push(`Format: ${format}`);
  if (method) lines.push(`Source: ${method}`);
  return lines.join("\n");
}


const pluginConfig = {
  name: "aio",
  alias: ["aio"],
  category: "download",
  description: "All in one downloader (IG, TikTok, FB, Twitter, YouTube, Pinterest, CapCut, dll)",
  usage: ".aio <url>",
  example: ".aio https://instagram.com/p/xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const url = m.text?.trim();

  if (!url) {
    return m.reply(novaGuideV2("aio", {
 kaomoji: "(◕ᴗ◕)",
 sapaan: "download semua platform! tinggal kasih linknya! (≧∇≦)ﾉ",
      cara: "tempel linknya sesudah command",
      contoh: `${m.prefix}aio https://instagram.com/p/xxx`,
      note: "bot otomatis deteksi platformnya dan langsung kasih hasilnya",
      spec: ["⚡ energi 1", "⏱ 10dtk", "💸 gratis"],
    }));
  }

  if (!url.startsWith("http")) {
    return m.reply(novaSalahV2("aio", {
 kaomoji: "(;ω;)",
      pesan: "linknya gak valid nih kak, harus diawali http atau https~",
      contoh: `${m.prefix}aio link`,
    }));
  }

  try {
    await m.react("🕒");

    // Step 1: Try IkyyXD all-in-one
    let result = await ikyyAio(url);

    // Step 2: Fallback to builtin scraper
    if (!result || !result.medias?.length) {
      console.log("[aio.js] IkyyXD failed, falling back to builtin...");
      const builtin = await aiodl(url);
      if (builtin?.media?.length) {
        // Normalize builtin format to match ikyy format
        result = {
          title: builtin.title || "Media",
          medias: builtin.media.map(item => ({
            url: item.url,
            quality: item.quality || "default",
            ext: item.ext || (item.type === "audio" ? "mp3" : "mp4"),
            type: item.type || "video",
          })),
        };
      }
    }

    if (!result || !result.medias?.length) {
      await m.react("❌");
      return m.reply(novaError('AIO', 'Gagal ambil media — pastikan URL valid ya'));
    }

    const ctxInfo = saluranCtx();

    for (const item of result.medias) {
      if (item.type === "video") {
        await sock.sendMedia(m.chat, item.url, result.title || null, m, {
          type: "video",
          contextInfo: ctxInfo,
        });
      } else if (item.type === "audio") {
        await sock.sendMessage(m.chat, {
          audio: { url: item.url },
          mimetype: "audio/mpeg",
          contextInfo: ctxInfo,
        }, { quoted: m });
      } else {
        await sock.sendMedia(m.chat, item.url, result.title || null, m, {
          type: "image",
          contextInfo: ctxInfo,
        });
      }
      break; // Send first/best quality only
    }

    await m.react("🐣");
    await m.reply(novaBerhasil("aio"));
  } catch (error) {
    console.error("[aio.js]:", error.message);
    await m.react("❌");
    m.reply(novaError('AIO', 'Ada error nih, coba lagi ya'));
  }
}

export { pluginConfig as config, handler };
