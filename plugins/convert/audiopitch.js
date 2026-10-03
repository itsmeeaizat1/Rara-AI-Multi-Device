// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { queueFFmpeg } from '../../src/lib/rara-ffmpeg.js'
import { raraError, raraEmpty, raraGuide, raraNoInput, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { raraWrap } from '../../src/lib/rara-menu-style.js'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { mediaInfoCaption } from "../../src/lib/rara-media-info.js";

const pluginConfig = {
  name: "audiopitch",
  alias: ["audiopitch"],
  aliases: ["audiopitch", "pitchshift", "audionada", "ubahpitch"],
  category: "convert",
  description: "Pitch shift custom - naik/turun nada semitone bebas",
  usage: ".audiopitch <semitone> (reply audio) | +2 = naik 2 semitone | -3 = turun 3 semitone",
  isGroupOnly: false,
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return m.reply(raraWrap("Audio Pitch", "Reply audio yang mau diubah pitch-nya."));
    const audioMsg = quoted.audioMessage || quoted.pttMessage;
    if (!audioMsg) return m.reply(raraWrap("Audio Pitch", "Reply harus audio/voice note!"));

    let semitone = parseFloat(args[0]);
    if (isNaN(semitone) || semitone < -12 || semitone > 12) {
      return m.reply(raraWrap("Audio Pitch", [
        "Pitch range -12 sampai +12 semitone",
        "+ = naik (lebih tinggi), - = turun (lebih rendah)",
        "",
        "Contoh: " + usedPrefix + "audiopitch +3",
        "Contoh: " + usedPrefix + "audiopitch -2",
        "Contoh: " + usedPrefix + "audiopitch +7 (naik 1 oktaf parsial)",
      ].join("\n")));
    }

    const isPtt = !!quoted.pttMessage;
    const tmpDir = path.join(os.tmpdir(), 'rara-pitch');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const inputPath = path.join(tmpDir, "input_" + Date.now() + ".ogg");
    const outputPath = path.join(tmpDir, "output_" + Date.now() + ".ogg");

    const buffer = await conn.downloadMediaMessage({ key: { remoteJid: m.key.remoteJid, id: m.quoted && m.quoted.id }, message: quoted });
    fs.writeFileSync(inputPath, buffer);

    // asetrate pitch shift: multiply by 2^(semitone/12)
    const pitchFactor = Math.pow(2, semitone / 12);
    // atempo to correct duration back
    const atempoCorrection = 1.0 / pitchFactor;
    let filter = "asetrate=44100*" + pitchFactor.toFixed(6) + ",atempo=" + atempoCorrection.toFixed(6);

    // atempo can only do 0.5-2.0, chain if needed
    let atempoParts = [];
    let remaining = atempoCorrection;
    while (remaining > 2.0) {
      atempoParts.push("atempo=2.0");
      remaining = remaining / 2.0;
    }
    while (remaining < 0.5) {
      atempoParts.push("atempo=0.5");
      remaining = remaining / 0.5;
    }
    atempoParts.push("atempo=" + remaining.toFixed(6));
    filter = "asetrate=44100*" + pitchFactor.toFixed(6) + "," + atempoParts.join(",");

    await queueFFmpeg('ffmpeg -y -i "' + inputPath + '" -af "' + filter + '" -c:a libopus -b:a 64k "' + outputPath + '"');

    if (!fs.existsSync(outputPath)) {
      return m.reply(raraGagal("AudioPitch"));
    }

    const buf = fs.readFileSync(outputPath);
    let descPitch = "";
    if (semitone > 0) descPitch = "+" + semitone + " semitone (lebih tinggi)";
    else if (semitone < 0) descPitch = semitone + " semitone (lebih rendah)";
    else descPitch = "0 (no change)";

    await conn.sendMessage(m.key.remoteJid, {
      audio: buf,
      mimetype: "audio/ogg; codecs=opus",
      ptt: isPtt,
      caption: raraWrap("Audio Pitch", [
        "Berhasil!",
        "Pitch: " + descPitch,
        "Factor: " + pitchFactor.toFixed(4) + "x",
      ].join("\n")),
    });
    await m.reply(mediaInfoCaption({ header: "Audio Pitch", fields: [
      { label: "Pitch", value: descPitch },
      { label: "Faktor", value: pitchFactor.toFixed(4) + "x" },
      { label: "Hasil", value: "Audio OGG Opus" },
      { label: "Ukuran", value: (buf.length / 1024).toFixed(1) + " KB" },
    ] }));

    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
      await m.reply(raraBerhasil("audiopitch"));
  } catch (e) {
    console.error("audiopitch error:", e);
    return m.reply(raraGangguan("audiopitch"));
  }
}

export { pluginConfig as config, handler };
