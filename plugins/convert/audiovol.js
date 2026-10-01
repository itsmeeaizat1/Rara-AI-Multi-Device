// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { queueFFmpeg } from '../../src/lib/nova-ffmpeg.js'
import { novaError, novaEmpty, novaGuide, novaNoInput, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";
import { novaWrap } from '../../src/lib/nova-menu-style.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

const pluginConfig = {
  name: "audiovol",
  alias: ["audiovol"],
  aliases: ["audiovol", "volset", "setvolume", "audiovolume2"],
  category: "convert",
  description: "Set volume custom 0-500% (bisa boost sampai 5x)",
  usage: ".audiovol <persen> (reply audio) | .audiovol 200 = 2x lebih keras | .audiovol 50 = setengah volume",
  isGroupOnly: false,
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return m.reply(novaWrap("Audio Volume", "Reply audio yang mau diubah volumenya."));
    const audioMsg = quoted.audioMessage || quoted.pttMessage;
    if (!audioMsg) return m.reply(novaWrap("Audio Volume", "Reply harus audio/voice note!"));

    const percent = parseInt(args[0]);
    if (!percent || percent < 1 || percent > 500) {
      return m.reply(novaWrap("Audio Volume", [
        "Volume 1% - 500%",
        "100 = normal, 200 = 2x lebih keras, 50 = setengah",
        "",
        "Contoh: " + usedPrefix + "audiovol 150",
        "Contoh: " + usedPrefix + "audiovol 300",
        "Contoh: " + usedPrefix + "audiovol 30",
      ].join("\n")));
    }

    const isPtt = !!quoted.pttMessage;
    const tmpDir = path.join(os.tmpdir(), 'nova-vol');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const inputPath = path.join(tmpDir, "input_" + Date.now() + ".ogg");
    const outputPath = path.join(tmpDir, "output_" + Date.now() + ".ogg");

    const buffer = await conn.downloadMediaMessage({ key: { remoteJid: m.key.remoteJid, id: m.quoted && m.quoted.id }, message: quoted });
    fs.writeFileSync(inputPath, buffer);

    const volumeFactor = percent / 100;
    let filter = "volume=" + volumeFactor.toFixed(2);

    if (percent > 200) {
      filter = "volume=" + volumeFactor.toFixed(2) + ",alimiter=limit=0.95:level=disabled";
    }

    await queueFFmpeg('ffmpeg -y -i "' + inputPath + '" -af "' + filter + '" -c:a libopus -b:a 64k "' + outputPath + '"');

    if (!fs.existsSync(outputPath)) {
      return m.reply(novaGagal("AudioVol"));
    }

    const buf = fs.readFileSync(outputPath);
    let descVol = "";
    if (percent === 100) descVol = "Normal (no change)";
    else if (percent > 100) descVol = percent + "% (" + volumeFactor.toFixed(1) + "x louder)";
    else descVol = percent + "% (" + volumeFactor.toFixed(1) + "x quieter)";

    await conn.sendMessage(m.key.remoteJid, {
      audio: buf,
      mimetype: "audio/ogg; codecs=opus",
      ptt: isPtt,
      caption: novaWrap("Audio Volume", [
        "Berhasil!",
        "Volume: " + descVol,
        percent > 200 ? "Limiter: aktif (anti clipping)" : "Limiter: tidak aktif",
      ].join("\n")),
    });

    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
      await m.reply(novaBerhasil("audiovol"));
  } catch (e) {
    console.error("audiovol error:", e);
    return m.reply(novaGangguan("audiovol"));
  }
}

export { pluginConfig as config, handler };
