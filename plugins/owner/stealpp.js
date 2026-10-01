// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import * as _canvas from '@napi-rs/canvas'
import axios from "axios";


import config from "../../config.js";
import te from "../../src/lib/rara-error.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
  name: "colongpp",
  alias: ["colongpp"],
  category: "owner",
  description: "Ambil & pakai foto profil target sebagai PP bot",
  usage: ".colongpp (reply pesan target)",
  example: ".colongpp",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};
const FALLBACK_PP = "https://telegra.ph/file/1ecdb5a0aee62ef17d7fc.jpg";
const PP_SIZE = 640;
async function resizeForPP(buffer) {
  const { createCanvas, loadImage } = _canvas;
  const img = await loadImage(buffer);
  const canvas = createCanvas(PP_SIZE, PP_SIZE);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, PP_SIZE, PP_SIZE);
  return canvas.toBuffer("image/jpeg");
}
async function handler(m, { sock }) {
  const targetJid = m.quoted?.sender || m.mentions?.[0];
  if (!targetJid) {
    return m.reply(raraWrap("colongpp", [
      "Colong foto profil target dan pasang jadi PP bot.",
      "",
      `📌 Format: reply pesan target, lalu ketik ${m.prefix}colongpp`,
      "",
      `💡 Contoh: reply pesan kakak, ketik ${m.prefix}colongpp`,
    ]));
  }
  await m.react("🕒");
  try {
    let ppBuffer;
    let source = "profil";
    try {
      const ppUrl = await sock.profilePictureUrl(targetJid, "image");
      const res = await axios.get(ppUrl, {
        responseType: "arraybuffer",
        timeout: 15000,
      });
      ppBuffer = Buffer.from(res.data);
    } catch {
      const res = await axios.get(FALLBACK_PP, {
        responseType: "arraybuffer",
        timeout: 15000,
      });
      ppBuffer = Buffer.from(res.data);
      source = "default (target tidak punya PP)";
    }
    const processed = await resizeForPP(ppBuffer);
    const botJid = sock.user?.id;
    await sock.updateProfilePicture(botJid, processed);
    await m.react("🐣");
    const targetNumber = targetJid.split("@")[0];
    return m.reply(raraWrap("colongpp", [
      "PP berhasil dicolong!",
      "",
      `Target: @${targetNumber}`,
      `Sumber: ${source}`,
    ]));
  } catch (err) {
    console.error("[ColongPP] Error:", err.message);
    await m.react("❌");
    return m.reply(raraWrap("colongpp", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
