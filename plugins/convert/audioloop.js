// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { queueFFmpeg } from '../../src/lib/rara-ffmpeg.js'
import { raraError, raraEmpty, raraGuide, raraNoInput, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { raraWrap } from '../../src/lib/rara-menu-style.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

const pluginConfig = {
  name: "audioloop",
  alias: ["audioloop"],
  aliases: ["audioloop", "loopaudio", "ulangaudio", "audiorepeat"],
  category: "convert",
  description: "Loop audio X kali jadi 1 file dengan fade antar loop",
  usage: ".audioloop <jumlah> (reply audio) | .audioloop <jumlah> fade <detik> (reply audio)",
  isGroupOnly: false,
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return m.reply(raraWrap("Audio Loop", "Reply audio yang mau di-loop."));
    const audioMsg = quoted.audioMessage || quoted.pttMessage;
    if (!audioMsg) return m.reply(raraWrap("Audio Loop", "Reply harus audio/voice note!"));

    const loopCount = parseInt(args[0]);
    if (!loopCount || loopCount < 2 || loopCount > 20) {
      return m.reply(raraWrap("Audio Loop", [
        "Jumlah loop 2-20x.",
        "Contoh: " + usedPrefix + "audioloop 3",
        "Dengan fade: " + usedPrefix + "audioloop 3 fade 1",
      ].join("\n")));
    }

    const fadeSec = args[1] === "fade" ? (parseFloat(args[2]) || 0) : 0;
    if (fadeSec > 5) return m.reply(raraWrap("Info", "Fade maksimal 5 detik."));

    const isPtt = !!quoted.pttMessage;
    const tmpDir = path.join(os.tmpdir(), 'rara-loop');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const inputPath = path.join(tmpDir, "input_" + Date.now() + ".ogg");
    const outputPath = path.join(tmpDir, "looped_" + Date.now() + ".ogg");

    const buffer = await conn.downloadMediaMessage({ key: { remoteJid: m.key.remoteJid, id: m.quoted && m.quoted.id }, message: quoted });
    fs.writeFileSync(inputPath, buffer);

    let cmd;
    if (fadeSec > 0) {
      let fadeFilters = [];
      for (let i = 0; i < loopCount; i++) {
        fadeFilters.push("[0:a]afade=t=out:st=999:d=" + fadeSec + "[a" + i + "];");
      }
      let concatInputs = "";
      for (let i = 0; i < loopCount; i++) {
        concatInputs += "[a" + i + "]";
      }
      let filterComplex = fadeFilters.join("") + concatInputs + "concat=n=" + loopCount + ":v=0:a=1[out]";
      cmd = 'ffmpeg -y -i "' + inputPath + '" -filter_complex "' + filterComplex + '" -map "[out]" -c:a libopus -b:a 64k "' + outputPath + '"';
    } else {
      let inputs = "";
      for (let i = 0; i < loopCount; i++) {
        inputs += '-i "' + inputPath + '" ';
      }
      let concatInputs = "";
      for (let i = 0; i < loopCount; i++) {
        concatInputs += "[" + i + ":a]";
      }
      let filterComplex = concatInputs + "concat=n=" + loopCount + ":v=0:a=1[out]";
      cmd = 'ffmpeg -y ' + inputs + '-filter_complex "' + filterComplex + '" -map "[out]" -c:a libopus -b:a 64k "' + outputPath + '"';
    }

    await queueFFmpeg(cmd);

    if (!fs.existsSync(outputPath)) {
      return m.reply(raraGagal("AudioLoop"));
    }

    const buf = fs.readFileSync(outputPath);
    await conn.sendMessage(m.key.remoteJid, {
      audio: buf,
      mimetype: "audio/ogg; codecs=opus",
      ptt: isPtt,
      caption: raraWrap("Audio Loop", [
        "Berhasil loop!",
        "Jumlah: " + loopCount + "x",
        fadeSec > 0 ? "Fade: " + fadeSec + " detik" : "Tanpa fade",
      ].join("\n")),
    });

    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
      await m.reply(raraBerhasil("audioloop"));
  } catch (e) {
    console.error("audioloop error:", e);
    return m.reply(raraGangguan("audioloop"));
  }
}

export { pluginConfig as config, handler };
