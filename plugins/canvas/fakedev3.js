// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getAssetBuffer } from "../../src/lib/nova-asset-manager.js";
import * as _canvas from '@napi-rs/canvas'
import axios from "axios";
import path from "path";
import fs from "fs";


import { uploadTo0x0 } from "../../src/lib/nova-tmpfiles.js";
import te from "../../src/lib/nova-error.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "fakedev3",
  alias: ["fakedev3"],
  category: "canvas",
  description: "Membuat fake developer profile card",
  usage: ".fakedev3 <nama> (reply/kirim foto)",
  example: ".fakedev3 Misaki",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};
let fontRegistered = false;
async function handler(m, { sock }) {
  const name = m.text?.trim();
  if (!name) {
    return m.reply(
      `🎮 *Fake Developer 3*\n\n` +
        `Masukkan nama untuk profile\n\n` +
        `*ᴄᴀʀᴀ ᴘᴀᴋᴀɪ:*\n` +
        `1. Kirim foto + caption \`${m.prefix}fakedev3 <nama>\`\n` +
        `2. Reply foto dengan \`${m.prefix}fakedev3 <nama>\``,
    );
  }
  let buffer = null;
  if (
    m.quoted &&
    (m.quoted.type === "imageMessage" || m.quoted.mtype === "imageMessage")
  ) {
    try {
      buffer = await m.quoted.download();
    } catch (e) {
      m.reply(claraWrap("fakedev3", te(m.prefix, m.command, m.pushName), "error"));
    }
  } else if (m.isMedia && m.type === "imageMessage") {
    try {
      buffer = await m.download();
    } catch (e) {
      m.reply(claraWrap("fakedev3", te(m.prefix, m.command, m.pushName), "error"));
    }
  } else {
    try {
      let te = await sock.profilePictureUrl(m.sender, "image");
      buffer = Buffer.from(
        (await axios.get(te, { responseType: "arraybuffer" })).data,
      );
    } catch (error) {
      buffer = getAssetBuffer("pp-kosong");
    }
  }
  if (!buffer) {
    return m.reply(novaError("FakeDev3", "Kirim/reply gambar dulu nih!"));
  }
  try {
    const gmbr = await uploadTo0x0(buffer, {
      filename: "image.jpg",
      contentType: "image/jpeg",
    });
    await sock.sendMedia(
      m.chat,
      `https://api.nova.my.id/api/fake-developer-1?text=${encodeURIComponent(name)}&image=${gmbr.directUrl}`,
      null,
      m,
      {
        type: "image",
      },
    );
  } catch (error) {
    m.reply(claraWrap("fakedev3", `Coba lagi`));
  }
}
export { pluginConfig as config, handler };
