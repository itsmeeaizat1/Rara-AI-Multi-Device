// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// gdrivedl — Download file dari Google Drive via IkyyXD
import { ikyyDl } from "../../src/scraper/ikyydl.js";
import { novaError, novaGuide } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "gdrivedl",
  alias: ["gdrivedl", "gddl"],
  category: "download",
  description: "Download file dari Google Drive",
  usage: ".gddl <url>",
  example: ".gddl https://drive.google.com/file/d/xxx/view",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  const url = m.text?.trim();
  if (!url) {
    return m.reply(novaGuide("GDrive DL", "Download file dari Google Drive! Kasih linknya ya!", `${m.prefix}gddl https://drive.google.com/file/d/xxx/view`));
  }
  if (!url.match(/drive\.google\.com|docs\.google\.com/i)) {
    return m.reply(novaGuide("GDrive DL", "URL-nya gak valid nih! Pakai link Google Drive ya.", `${m.prefix}gddl https://drive.google.com/file/d/xxx/view`));
  }

  try {
    await m.react("🕒");
    const result = await ikyyDl("gdrive", url);

    if (result?.medias?.length) {
      const file = result.medias[0];
      await m.react("🐣");
      await sock.sendMedia(m.chat, file.url, result.title || "Google Drive File", m, {
        type: "file",
        contextInfo: { forwardingScore: 0, isForwarded: false },
      });
    } else {
      await m.react("❌");
      await m.reply(novaError("GDrive DL", "Gagal ambil file — pastikan file bersifat publik ya"));
    }
  } catch (error) {
    console.error("[gdrivedl.js]:", error.message);
    await m.react("❌");
    return m.reply(novaError("GDrive DL", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
