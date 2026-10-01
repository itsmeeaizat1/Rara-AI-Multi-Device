// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { queueFFmpeg } from '../../src/lib/nova-ffmpeg.js'
import { novaError, novaEmpty, novaGuide, novaNoInput, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";
import { novaWrap } from '../../src/lib/nova-menu-style.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

const pluginConfig = {
  name: "audio8d",
  alias: ["audio8d"],
  aliases: ["audio8d", "8daudio", "spatial", "surround"],
  category: "convert",
  description: "Efek 8D spatial audio - suara mutar kiri kanan seperti surround",
  usage: ".audio8d (reply audio) | .audio8d <speed> (reply audio) | .audio8d depth <0-1> (reply audio)",
  isGroupOnly: false,
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return m.reply(novaWrap("Audio 8D", "Reply audio yang mau dijadikan 8D."));
    const audioMsg = quoted.audioMessage || quoted.pttMessage;
    if (!audioMsg) return m.reply(novaWrap("Audio 8D", "Reply harus audio/voice note!"));

    const isPtt = !!quoted.pttMessage;
    const tmpDir = path.join(os.tmpdir(), 'nova-8d');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const inputPath = path.join(tmpDir, "input_" + Date.now() + ".ogg");
    const outputPath = path.join(tmpDir, "8d_" + Date.now() + ".ogg");

    const buffer = await conn.downloadMediaMessage({ key: { remoteJid: m.key.remoteJid, id: m.quoted && m.quoted.id }, message: quoted });
    fs.writeFileSync(inputPath, buffer);

    const sub = (args[0] || "").toLowerCase();
    let rotationSpeed = 0.2;
    let depth = 0.8;

    if (sub === "speed" || sub === "s") {
      rotationSpeed = parseFloat(args[1]) || 0.2;
      if (rotationSpeed < 0.05 || rotationSpeed > 2.0) return m.reply(novaWrap("Info", "Speed 0.05-2.0. Contoh: .audio8d speed 0.5"));
    }

    if (sub === "depth" || sub === "d") {
      depth = parseFloat(args[1]) || 0.8;
      if (depth < 0.1 || depth > 1.0) return m.reply(novaWrap("Info", "Depth 0.1-1.0. Contoh: .audio8d depth 0.9"));
    }

    if (!isNaN(parseFloat(sub)) && sub !== "") {
      rotationSpeed = parseFloat(sub);
    }

    let filter = [
      "aformat=channel_layouts=stereo",
      "pan=stereo|c0=c0|c1=c0",
      "aecho=0.8:0.9:100:0.3",
      "tremolo=f=" + rotationSpeed + ":d=" + depth,
      "apad=pad_dur=0.5",
      "loudnorm=I=-16:TP=-1.5:LRA=11",
    ].join(",");

    await queueFFmpeg('ffmpeg -y -i "' + inputPath + '" -af "' + filter + '" -c:a libopus -b:a 64k "' + outputPath + '"');

    if (!fs.existsSync(outputPath)) {
      return m.reply(novaGagal("Audio8D"));
    }

    const buf = fs.readFileSync(outputPath);
    await conn.sendMessage(m.key.remoteJid, {
      audio: buf,
      mimetype: "audio/ogg; codecs=opus",
      ptt: isPtt,
      caption: novaWrap("Audio 8D", [
        "Berhasil! Pakai headphone untuk efek maksimal",
        "Rotation speed: " + rotationSpeed,
        "Depth: " + depth,
      ].join("\n")),
    });

    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
      await m.reply(novaBerhasil("audio8d"));
  } catch (e) {
    console.error("audio8d error:", e);
    return m.reply(novaGangguan("audio8d"));
  }
}

export { pluginConfig as config, handler };
