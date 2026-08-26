// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import * as _canvas from '@napi-rs/canvas'
import axios from "axios";


import config from "../../config.js";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
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
  console.log(targetJid);
  if (!targetJid) {
    return m.reply( `🕵️ *Colong Pp*\n\n` +
        `Reply pesan seseorang untuk mencuri PP-nya\n\n` +
        `*Cara:*\n` +
        `Reply pesan target → \`${m.prefix}colongpp\``, "colongpp");
  }
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
    const targetNumber = targetJid.split("@")[0];
    await m.react("🐣");
    return m.reply(claraWrap("colongpp", `✅ *Pp Berhasil Dicolong!*\n\n` +
        `🎯 Target: @${targetNumber}\n` +
        `📸 Sumber: ${source}`));
  } catch (err) {
    console.error("[ColongPP] Error:", err.message);
    return m.reply(claraWrap("colongpp", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
