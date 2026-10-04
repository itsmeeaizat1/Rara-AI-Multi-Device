// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { getAssetBuffer } from "../../src/lib/rara-asset-manager.js";
import * as _canvas from '@napi-rs/canvas'
import axios from "axios";
import path from "path";
import fs from "fs";


import { uploadTo0x0 } from "../../src/lib/rara-tmpfiles.js";
import te from "../../src/lib/rara-error.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
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
      `🎮 *fake ml profile*\n\n` +
        `Masukkan nama untuk profile\n\n` +
        `*cara pakai:*\n` +
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
      m.reply(raraWrap("fakeml", te(m.prefix, m.command, m.pushName), "error"));
    }
  } else if (m.isMedia && m.type === "imageMessage") {
    try {
      buffer = await m.download();
    } catch (e) {
      m.reply(raraWrap("fakeml", te(m.prefix, m.command, m.pushName), "error"));
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
    return m.reply(raraError("FakeML", "Kirim/reply gambar dulu nih!"));
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
    m.reply(raraWrap("fakeml", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
