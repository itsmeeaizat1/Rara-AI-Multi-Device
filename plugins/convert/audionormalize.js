// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { queueFFmpeg } from '../../src/lib/nova-ffmpeg.js'
import { claraWrap } from '../../src/lib/nova-menu-style.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

const pluginConfig = {
  name: "audionormalize",
  aliases: ["audionormalize", "normalisasi", "audiovolume", "boostvolume"],
  category: "convert",
  description: "Auto normalize volume audio biar suara konsisten",
  usage: ".audionormalize (reply audio) | .audionormalize loud | .audionormalize soft | .audionormalize extreme",
  isGroupOnly: false,
};

const MODES = {
  default: { filter: "loudnorm=I=-16:TP=-1.5:LRA=11", desc: "Normalize standar (loudnorm EBU R128)" },
  loud: { filter: "loudnorm=I=-12:TP=-1:LRA=7,volume=1.5", desc: "Normalize + boost" },
  soft: { filter: "loudnorm=I=-20:TP=-2:LRA=14,dynaudnorm=f=150", desc: "Normalize + halus" },
  extreme: { filter: "loudnorm=I=-10:TP=-0.5:LRA=5,volume=2.0,compand=attacks=0:points=-80/-80|-45/-40|-25/-12|0/-3", desc: "Extreme boost + compress" },
  speech: { filter: "highpass=f=100,loudnorm=I=-16:TP=-1.5:LRA=11, dynaudnorm=f=200:p=0.5", desc: "Optimal untuk voice note" },
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return m.reply(claraWrap("Audio Normalize", `Reply audio/voice note yang mau di-normalize.`));
    const audioMsg = quoted.audioMessage || quoted.pttMessage;
    if (!audioMsg) return m.reply(claraWrap("Audio Normalize", "Reply harus audio/voice note!"));

    const mode = (args[0] || "default").toLowerCase();
    if (!MODES[mode]) {
      return m.reply(claraWrap("Audio Normalize", [
        `Mode: ${Object.keys(MODES).join(", ")}`,
        `Contoh: ${usedPrefix}audionormalize loud`,
      ].join("\n")));
    }

    const isPtt = !!quoted.pttMessage;
    const tmpDir = path.join(os.tmpdir(), 'nova-normalize');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const inputPath = path.join(tmpDir, `input_${Date.now()}.mp3`);
    const outputPath = path.join(tmpDir, `normalized_${Date.now()}.mp3`);

    const buffer = await conn.downloadMediaMessage({ key: { remoteJid: m.key.remoteJid, id: m.quoted?.id }, message: quoted });
    fs.writeFileSync(inputPath, buffer);

    const filter = MODES[mode].filter;
    await queueFFmpeg(`ffmpeg -y -i "${inputPath}" -af "${filter}" -c:a libopus -b:a 64k "${outputPath}"`);

    if (!fs.existsSync(outputPath)) {
      return m.reply(claraWrap("Audio Normalize", "Gagal normalize audio. Coba lagi."));
    }

    const buf = fs.readFileSync(outputPath);
    await conn.sendMessage(m.key.remoteJid, {
      audio: buf,
      mimetype: "audio/ogg; codecs=opus",
      ptt: isPtt,
      caption: claraWrap("Audio Normalize", [
        `Berhasil normalize!`,
        `Mode: ${mode}`,
        `Filter: ${MODES[mode].desc}`,
      ].join("\n")),
    });

    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
  } catch (e) {
    console.error("audionormalize error:", e);
    return m.reply("Error: " + e.message);
  }
}

export default { pluginConfig, handler };
