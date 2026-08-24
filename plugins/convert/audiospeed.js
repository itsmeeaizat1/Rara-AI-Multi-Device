// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { queueFFmpeg } from '../../src/lib/nova-ffmpeg.js'
import { claraWrap } from '../../src/lib/nova-menu-style.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

const pluginConfig = {
  name: "audiospeed",
  aliases: ["audiospeed", "speedaudio", "audiotempo", "ubahcepat"],
  category: "convert",
  description: "Custom tempo audio 0.25x - 4x (percepat/perlambat bebas)",
  usage: ".audiospeed <0.25-4.0> (reply audio) | .audiospeed 0.5 | .audiospeed 2.0",
  isGroupOnly: false,
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return m.reply(claraWrap("Audio Speed", "Reply audio yang mau diubah kecepatannya."));
    const audioMsg = quoted.audioMessage || quoted.pttMessage;
    if (!audioMsg) return m.reply(claraWrap("Audio Speed", "Reply harus audio/voice note!"));

    const speed = parseFloat(args[0]);
    if (!speed || speed < 0.25 || speed > 4.0) {
      return m.reply(claraWrap("Audio Speed", [
        "Kecepatan 0.25 - 4.0x",
        "1.0 = normal, 2.0 = 2x cepat, 0.5 = 2x lambat",
        "",
        "Contoh: " + usedPrefix + "audiospeed 1.5",
        "Contoh: " + usedPrefix + "audiospeed 0.75",
      ].join("\n")));
    }

    const isPtt = !!quoted.pttMessage;
    const tmpDir = path.join(os.tmpdir(), 'nova-speed');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const inputPath = path.join(tmpDir, "input_" + Date.now() + ".ogg");
    const outputPath = path.join(tmpDir, "output_" + Date.now() + ".ogg");

    const buffer = await conn.downloadMediaMessage({ key: { remoteJid: m.key.remoteJid, id: m.quoted && m.quoted.id }, message: quoted });
    fs.writeFileSync(inputPath, buffer);

    let filter = "atempo=" + speed;
    if (speed < 0.5) filter = "atempo=0.5,atempo=" + (speed / 0.5);
    if (speed > 2.0) filter = "atempo=2.0,atempo=" + (speed / 2.0);

    await queueFFmpeg('ffmpeg -y -i "' + inputPath + '" -af "' + filter + '" -c:a libopus -b:a 64k "' + outputPath + '"');

    if (!fs.existsSync(outputPath)) {
      return m.reply(claraWrap("Audio Speed", "Gagal ubah kecepatan audio."));
    }

    const buf = fs.readFileSync(outputPath);
    let descSpeed = "";
    if (speed === 1.0) descSpeed = "Normal (no change)";
    else if (speed > 1.0) descSpeed = speed + "x lebih cepat";
    else descSpeed = speed + "x lebih lambat";

    await conn.sendMessage(m.key.remoteJid, {
      audio: buf,
      mimetype: "audio/ogg; codecs=opus",
      ptt: isPtt,
      caption: claraWrap("Audio Speed", [
        "Berhasil!",
        "Kecepatan: " + descSpeed,
        "Filter: " + filter,
      ].join("\n")),
    });

    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
  } catch (e) {
    console.error("audiospeed error:", e);
    return m.reply("Error: " + e.message);
  }
}

export { pluginConfig as config, handler };
