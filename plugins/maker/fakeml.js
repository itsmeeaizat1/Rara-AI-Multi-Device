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
  name: "fakeml",
  alias: ["fakeml"],
  category: "maker",
  description: "Membuat fake ML profile card",
  usage: ".fakeml <nama> (reply/kirim foto)",
  example: ".fakeml Misaki",
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
      `🎮 *ꜰᴀᴋᴇ ᴍʟ ᴘʀᴏꜰɪʟᴇ*\n\n` +
        `Masukkan nama untuk profile\n\n` +
        `*ᴄᴀʀᴀ ᴘᴀᴋᴀɪ:*\n` +
        `1. Kirim foto + caption \`${m.prefix}fakeml <nama>\`\n` +
        `2. Reply foto dengan \`${m.prefix}fakeml <nama>\``,
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
      m.reply(claraWrap("fakeml", te(m.prefix, m.command, m.pushName), "error"));
    }
  } else if (m.isMedia && m.type === "imageMessage") {
    try {
      buffer = await m.download();
    } catch (e) {
      m.reply(claraWrap("fakeml", te(m.prefix, m.command, m.pushName), "error"));
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
    return m.reply(novaError("FakeML", "Kirim/reply gambar dulu nih!"));
  }
  try {
    await m.react("🕒");
    const gmbr = await uploadTo0x0(buffer, {
      filename: "image.jpg",
      contentType: "image/jpeg",
    });
    await sock.sendMedia(
      m.chat,
      `https://api.nexray.web.id/maker/fakelobyml?avatar=${encodeURIComponent(gmbr.directUrl)}&nickname=${encodeURIComponent(name)}`,
      null,
      m,
      {
        type: "image",
      },
    );
    await m.react("🐣");
  } catch (error) {
    await m.react("❌");
    m.reply(claraWrap("fakeml", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
