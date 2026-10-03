// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { queueFFmpeg } from '../../src/lib/rara-ffmpeg.js'
import { raraError, raraEmpty, raraGuide, raraNoInput, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { raraWrap } from '../../src/lib/rara-menu-style.js'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { mediaInfoCaption } from "../../src/lib/rara-media-info.js";

const pluginConfig = {
  name: "audiofade",
  alias: ["audiofade"],
  aliases: ["audiofade", "fadeaudio", "audiofadein", "audiofadeout"],
  category: "convert",
  description: "Tambah fade in/out ke audio untuk transisi smooth",
  usage: ".audiofade in <detik> (reply audio) | .audiofade out <detik> (reply audio) | .audiofade both <in> <out> (reply audio)",
  isGroupOnly: false,
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return m.reply(raraWrap("Audio Fade", `Reply audio yang mau ditambah fade.`));
    const audioMsg = quoted.audioMessage || quoted.pttMessage;
    if (!audioMsg) return m.reply(raraWrap("Audio Fade", "Reply harus audio/voice note!"));

    const mode = (args[0] || "").toLowerCase();
    if (!["in", "out", "both", "smooth", "duck"].includes(mode)) {
      return m.reply(raraWrap("Audio Fade", [
        `Mode: in, out, both, smooth, duck`,
        "",
        `1. ${usedPrefix}audiofade in <detik> - Fade in awal`,
        `2. ${usedPrefix}audiofade out <detik> - Fade out akhir`,
        `3. ${usedPrefix}audiofade both <in> <out> - Fade in + out`,
        `4. ${usedPrefix}audiofade smooth <detik> - Fade both halus`,
        `5. ${usedPrefix}audiofade duck - Side chain ducking`,
      ].join("\n")));
    }

    const isPtt = !!quoted.pttMessage;
    const tmpDir = path.join(os.tmpdir(), 'rara-fade');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const inputPath = path.join(tmpDir, `input_${Date.now()}.mp3`);
    const outputPath = path.join(tmpDir, `faded_${Date.now()}.ogg`);

    const buffer = await conn.downloadMediaMessage({ key: { remoteJid: m.key.remoteJid, id: m.quoted?.id }, message: quoted });
    fs.writeFileSync(inputPath, buffer);

    let filter = "";
    let desc = "";

    if (mode === "in") {
      const sec = parseFloat(args[1]) || 2;
      if (sec < 0.1 || sec > 30) return m.reply(raraWrap("Info", "Durasi 0.1-30 detik."));
      filter = `afade=t=in:st=0:d=${sec}`;
      desc = `Fade in ${sec} detik`;
    }

    else if (mode === "out") {
      const sec = parseFloat(args[1]) || 2;
      if (sec < 0.1 || sec > 30) return m.reply(raraWrap("Info", "Durasi 0.1-30 detik."));
      filter = `afade=t=out:st=99999:d=${sec}`;
      desc = `Fade out ${sec} detik`;
    }

    else if (mode === "both") {
      const inSec = parseFloat(args[1]) || 2;
      const outSec = parseFloat(args[2]) || 3;
      if (inSec < 0.1 || inSec > 30 || outSec < 0.1 || outSec > 30) return m.reply(raraWrap("Info", "Durasi 0.1-30 detik."));
      filter = `afade=t=in:st=0:d=${inSec},afade=t=out:st=99999:d=${outSec}`;
      desc = `Fade in ${inSec}s + Fade out ${outSec}s`;
    }

    else if (mode === "smooth") {
      const sec = parseFloat(args[1]) || 3;
      if (sec < 0.5 || sec > 30) return m.reply(raraWrap("Info", "Durasi 0.5-30 detik."));
      filter = `afade=t=in:st=0:d=${sec},afade=t=out:st=99999:d=${sec},aecho=0.8:0.88:30:0.3`;
      desc = `Smooth fade ${sec}s + echo`;
    }

    else if (mode === "duck") {
      filter = `compand=attacks=0:points=-80/-80|-45/-40|-25/-12|0/-3,afade=t=in:st=0:d=1,afade=t=out:st=99999:d=1`;
      desc = `Duck + compress + fade`;
    }

    await queueFFmpeg(`ffmpeg -y -i "${inputPath}" -af "${filter}" -c:a libopus -b:a 64k "${outputPath}"`);

    if (!fs.existsSync(outputPath)) {
      return m.reply(raraGagal("AudioFade"));
    }

    const buf = fs.readFileSync(outputPath);
    await conn.sendMessage(m.key.remoteJid, {
      audio: buf,
      mimetype: "audio/ogg; codecs=opus",
      ptt: isPtt,
      caption: raraWrap("Audio Fade", `Berhasil!\nMode: ${mode}\n${desc}`),
    });
    await m.reply(mediaInfoCaption({ header: "Audio Fade", fields: [
      { label: "Mode", value: mode },
      { label: "Detail", value: desc },
      { label: "Hasil", value: "Audio OGG Opus" },
      { label: "Ukuran", value: (buf.length / 1024).toFixed(1) + " KB" },
    ] }));

    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
      await m.reply(raraBerhasil("audiofade"));
  } catch (e) {
    console.error("audiofade error:", e);
    return m.reply(raraGangguan("audiofade"));
  }
}

export { pluginConfig as config, handler };
