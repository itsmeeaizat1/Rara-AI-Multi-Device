// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// mediafiredl — Download file dari MediaFire
// Primary: IkyyXD /download/mediafire | Fallback: builtin mediafire.js
import { ikyyDl } from "../../src/scraper/ikyydl.js";
import te from "../../src/lib/rara-error.js";
import mediafire from "../../src/scraper/mediafire.js";
import { raraGuideV2, raraWrap, raraLine, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { raraError, raraGuide } from "../../src/lib/rara-menu-style.js";

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
  name: "mediafiredl",
  alias: ["mediafiredl", "mfdl"],
  category: "download",
  description: "Download file dari MediaFire",
  usage: ".mfdl <url>",
  example: ".mfdl https://www.mediafire.com/file/xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const url = m.text?.trim();
  if (!url) {
    return m.reply(raraGuideV2("mediafire", {
 kaomoji: "(¬‿¬)✧",
 sapaan: "file di mediafire pengen diunduh? tempel linknya! (๑˃̵ᴗ˂̵)و",
      cara: "tempel link file mediafirenya sesudah command",
      contoh: `${m.prefix}${m.command || "mfdl"} https://www.mediafire.com/file/xxx`,
      note: "bot unduh file-nya lalu kirim langsung ke chat",
      spec: ["⚡ energi 1", "⏱ 10dtk", "💸 gratis"],
    }));
  }
  if (!url.match(/mediafire\.com/i)) {
    return m.reply(raraGuide("MediaFire DL", "URL-nya gak valid nih! Pakai link MediaFire ya.", `${m.prefix}mfdl https://www.mediafire.com/file/xxx`));
  }

  try {
    await m.react("🕒");

    // Step 1: Try IkyyXD mediafire endpoint
    const result = await ikyyDl("mediafire", url);

    if (result?.medias?.length) {
      const file = result.medias[0];
      await m.react("🐣");
      const _cap = mediaCaption({ platformIcon: "🔥", platformName: "MediaFire", title: result.title || "MediaFire File", format: "File", method: "IkyyXD" });
      return await sock.sendMessage(m.chat, {
        document: { url: file.url }, caption: _cap,
        contextInfo: { forwardingScore: 0, isForwarded: false },
      }, { quoted: m });
    }

    // Step 2: Fallback to builtin mediafire.js
    console.log("[mediafiredl.js] IkyyXD failed, falling back to builtin...");
    try {
      const data = await mediafire(url);
      if (data?.download_url || data?.link) {
        await m.react("🐣");
        const _cap2 = mediaCaption({ platformIcon: "🔥", platformName: "MediaFire", title: data?.title || data?.name || "MediaFire File", format: data?.ext || "File", method: "builtin" });
        await sock.sendMessage(m.chat, {
          document: { url: data.download_url || data.link }, caption: _cap2,
          contextInfo: { forwardingScore: 0, isForwarded: false },
        }, { quoted: m });
        await m.reply(raraBerhasil("mediafiredl"));
        return;
      }
    } catch (e) {
      console.error("[mediafiredl.js] builtin fallback failed:", e.message);
    }

    await m.react("❌");
    return m.reply(raraGagal("MediaFire DL"));
  } catch (error) {
    console.error("[mediafiredl.js]:", error.message);
    await m.react("❌");
    return m.reply(raraError("MediaFire DL", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
