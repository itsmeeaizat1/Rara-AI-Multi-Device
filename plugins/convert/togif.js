// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import os from "os";
import te from "../../src/lib/nova-error.js";
import { claraWrap, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";
import { mediaInfoCaption, fmtBytes } from "../../src/lib/nova-media-info.js";
import { uploadToCatbox } from "../../src/lib/nova-uploader.js";
import { getApiKeys } from "../../src/lib/config/env-loader.js";
import axios from "axios";

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
    if (!quoted) return m.reply(claraWrap("togif", "Reply sticker atau video dengan caption .togif", "guide"));

    const isMedia = quoted.type === "stickerMessage" || quoted.type === "videoMessage" || quoted.mtype === "stickerMessage" || quoted.mtype === "videoMessage";
    if (!isMedia) return m.reply(claraWrap("togif", "Reply harus sticker atau video!", "guide"));

    await m.react("🕒");

    const mediaBuffer = await quoted.download();
    if (!mediaBuffer) { await m.react("❌"); return m.reply(claraWrap("togif", "Gagal mengunduh media.")); }

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
      // Fallback: upload ke catbox lalu convert webp → mp4
      const link = await uploadToCatbox(mediaBuffer, "media.webp");
      const convertRes = await axios.get(`https://api.betabotz.eu.org/api/tools/webp2mp4?url=${link}&apikey=${getApiKeys().betabotz || "beta-gilang"}`, { timeout: 60000 });
      const convertUrl = convertRes.data?.result?.url || convertRes.data?.url;
      if (!convertUrl) throw new Error("Gagal convert ke GIF");

      await m.react("🐣");
      await sock.sendMessage(m.chat, { video: { url: convertUrl }, gifPlayback: true }, { quoted: m });
      // format info hasil (request owner 19-20 Sep — field sesuai fitur)
      await m.reply(mediaInfoCaption({ header: "Nova To GIF", fields: [
        { icon: "📥", label: "Input", value: "Sticker" },
        { icon: "📤", label: "Output", value: "GIF" },
        { icon: "⚙️", label: "Engine", value: "Betabotz webp2mp4" },
      ] }));
    }
  } catch (e) {
    console.error("togif error:", e.message);
    await m.react("❌");
    m.reply(novaGangguan("togif"));
  }
}

export { pluginConfig as config, handler };
