// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { removeBgLocal } from "../../src/scraper/removebg-v2.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "removebgv2",
  alias: ["removebgv2"],
  category: "tools",
  description: "Hapus background gambar (AI local, hasil bersih, gratis)",
  usage: ".removebgv2 (reply gambar)\n.removebgv2 doc — kirim sebagai dokumen (no compress)",
  example: ".removebgv2\n.removebgv2 doc",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const isImage =
      m.isImage || (m.quoted && (m.quoted.isImage || m.quoted?.type === "imageMessage"));

    if (!isImage) {
      const text =
        claraWrap("RemoveBG V2", [`Reply atau kirim gambar dengan caption .removebgv2`,
          `AI lokal, hasil bersih, gratis tanpa API`,
          `Output: PNG transparan (full quality)`,
          ``,
          `*opsi:*`,
          `${prefix}removebgv2 — kirim sebagai gambar`,
          `${prefix}removebgv2 doc — kirim sebagai dokumen (no compress)`].join("\n")) + "\n" +
        tipText("Reply gambar lalu ketik .removebgv2");

      await m.reply( text, "removebgv2");
      return { handled: true };
    }
    // Download gambar
    let mediaBuffer;
    if (m.isImage && m.download) {
      mediaBuffer = await m.download();
    } else if (m.quoted && m.quoted.download) {
      mediaBuffer = await m.quoted.download();
    } else {
      const text =
        claraWrap("RemoveBG V2", [`Status: *gagal download gambar*`,
          `Coba reply gambar yang valid`].join("\n")) + "\n" +
        tipText("Reply gambar lalu ketik .removebgv2");

      await m.reply( text, "removebgv2");
      return { handled: true };
    }

    if (!mediaBuffer || !Buffer.isBuffer(mediaBuffer)) {
      const text =
        claraWrap("RemoveBG V2", [`Status: *buffer gambar tidak valid*`,
          `Coba gambar lain`].join("\n")) + "\n" +
        tipText("Reply gambar lalu ketik .removebgv2");

      await m.reply( text, "removebgv2");
      return { handled: true };
    }

    // Cek ukuran file
    if (mediaBuffer.length > MAX_FILE_SIZE) {
      const sizeMB = (mediaBuffer.length / 1024 / 1024).toFixed(1);
      const text =
        claraWrap("RemoveBG V2", [`Status: *file terlalu besar*`,
          `Ukuran: *${sizeMB} MB*`,
          `Maksimal: *10 MB*`,
          `Compress gambar dulu atau gunakan resolusi lebih kecil`].join("\n")) + "\n" +
        tipText("Gunakan gambar di bawah 10MB");

      await m.reply( text, "removebgv2");
      return { handled: true };
    }

    // Parse argumen: doc mode
    const input = (m.body || "").replace(/^[!.#]\S+\s*/, "").trim().toLowerCase();
    const wantDoc = input.includes("doc") || input.includes("dokumen");

    // Proses remove background
    const resultBuffer = await removeBgLocal(mediaBuffer, {
      outputFormat: "image/png",
      quality: 1.0,
    });

    if (!resultBuffer || resultBuffer.length === 0) {
      const text =
        claraWrap("RemoveBG V2", [`Status: *gagal hapus background*`,
          `Mungkin gambar tidak support, coba gambar lain`].join("\n")) + "\n" +
        tipText("Coba gambar dengan subjek yang jelas");

      await m.reply( text, "removebgv2");
      return { handled: true };
    }

    const resultSize = resultBuffer.length;
    const resultMB = resultSize / 1024 / 1024;
    const useDoc = wantDoc || resultMB > 5;
    // Kirim hasil
    if (useDoc) {
      await sock.sendMessage(m.chat, {
        document: resultBuffer,
        fileName: "removebg_result.png",
        mimetype: "image/png",
        caption:
          claraWrap("RemoveBG V2", [`Status: *background dihapus*`,
            `Mode: *Dokumen (no compress)*`,
            `Ukuran: *${(resultSize / 1024).toFixed(0)} KB*`,
            `Format: *png transparan*`,
            `Engine: *ai onnx lokal*`].join("\n")) + "\n" +
          tipText("Hasil full quality tanpa kompresi"),
      }, { quoted: m });
    } else {
      await m.react("🐣");
      await sock.sendMessage(m.chat, {
        image: resultBuffer,
        caption:
          claraWrap("RemoveBG V2", [`Status: *background dihapus*`,
            `Mode: *gambar*`,
            `Ukuran: *${(resultSize / 1024).toFixed(0)} KB*`,
            `Format: *png transparan*`,
            `Engine: *ai onnx lokal*`].join("\n")) + "\n" +
          tipText(`Untuk no compress: ${prefix}removebgv2 doc`),
      }, { quoted: m });
    }

    return { handled: true };
  } catch (error) {
    await m.react("❌");
    console.error("[RemoveBG V2 Error]", error);
    const text =
      novaError("Tools", "Gagal nih, coba lagi ya");

    await m.reply(text, "removebgv2");
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
