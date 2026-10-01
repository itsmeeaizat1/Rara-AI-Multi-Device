// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import os from "os";
import te from "../../src/lib/nova-error.js";
import { novaWrap, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";
import { mediaInfoCaption, fmtBytes } from "../../src/lib/nova-media-info.js";

const pluginConfig = {
  name: "togif",
  alias: ["togif"],
  aliases: ["togif", "togift"],
  category: "convert",
  description: "Convert sticker/video menjadi GIF",
  usage: ".togif (reply sticker/video)",
  example: ".togif",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const quoted = m.quoted;
    if (!quoted) return m.reply(novaWrap("togif", "Reply sticker atau video dengan caption .togif", "guide"));

    const isMedia = quoted.type === "stickerMessage" || quoted.type === "videoMessage" || quoted.mtype === "stickerMessage" || quoted.mtype === "videoMessage";
    if (!isMedia) return m.reply(novaWrap("togif", "Reply harus sticker atau video!", "guide"));

    await m.react("🕒");

    const mediaBuffer = await quoted.download();
    if (!mediaBuffer) { await m.react("❌"); return m.reply(novaWrap("togif", "Gagal mengunduh media.")); }

    // Coba kirim langsung sebagai video dengan gifPlayback
    try {
      await m.react("🐣");
      const inputKind = (quoted.type || quoted.mtype || "").includes("sticker") ? "Sticker" : "Video";
      // format info hasil (request owner 19-20 Sep — field sesuai fitur)
      await sock.sendMessage(m.chat, {
        video: mediaBuffer,
        mimetype: "video/mp4",
        gifPlayback: true,
        caption: mediaInfoCaption({ header: "Nova To GIF", fields: [
          { icon: "📥", label: "Input", value: inputKind },
          { icon: "📤", label: "Output", value: "GIF" },
          { icon: "📦", label: "Ukuran", value: fmtBytes(mediaBuffer.length) },
          { icon: "⚙️", label: "Engine", value: "WA gifPlayback" },
        ] }),
      }, { quoted: m });
    } catch (err) {
      // Jalur utama WA gifPlayback sudah tidak bergantung provider eksternal.
      throw new Error(`WA gifPlayback gagal: ${err.message}`);
    }
  } catch (e) {
    console.error("togif error:", e.message);
    await m.react("❌");
    m.reply(novaGangguan("togif"));
  }
}

export { pluginConfig as config, handler };
