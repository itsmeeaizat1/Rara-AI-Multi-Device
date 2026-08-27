// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { queueFFmpeg } from '../../src/lib/nova-ffmpeg.js'
import { claraWrap } from '../../src/lib/nova-menu-style.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

const pluginConfig = {
  name: "audioeq",
  alias: ["audioeq"],
  aliases: ["audioeq", "equalizer", "audiotone", "eqaudio"],
  category: "convert",
  description: "Equalizer custom - bass/mid/treble gain -12 sampai +12 dB",
  usage: ".audioeq <bass> <mid> <treble> (reply audio) | .audioeq 5 -2 8 | preset: .audioeq preset <nama>",
  isGroupOnly: false,
};

const PRESETS = {
  flat:     { bass: 0,  mid: 0,  treble: 0,  desc: "Flat (neutral)" },
  bass:     { bass: 10, mid: 0,  treble: 0,  desc: "Bass boost" },
  treble:   { bass: 0,  mid: 0,  treble: 10, desc: "Treble boost" },
  vocal:    { bass: -3, mid: 5,  treble: 3,  desc: "Vocal forward" },
  rock:     { bass: 6,  mid: -2, treble: 7,  desc: "Rock" },
  pop:      { bass: 2,  mid: 3,  treble: 5,  desc: "Pop" },
  jazz:     { bass: 4,  mid: -1, treble: 4,  desc: "Jazz" },
  club:     { bass: 8,  mid: 2,  treble: 5,  desc: "Club" },
  speech:   { bass: -5, mid: 4,  treble: 6,  desc: "Speech optimized" },
  warm:     { bass: 5,  mid: 3,  treble: -3, desc: "Warm" },
  bright:   { bass: -2, mid: 2,  treble: 8,  desc: "Bright" },
  night:    { bass: 8,  mid: -4, treble: -6, desc: "Night mode" },
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return m.reply(claraWrap("Audio EQ", "Reply audio yang mau di-EQ."));
    const audioMsg = quoted.audioMessage || quoted.pttMessage;
    if (!audioMsg) return m.reply(claraWrap("Audio EQ", "Reply harus audio/voice note!"));

    let bassGain, midGain, trebleGain;
    const sub = (args[0] || "").toLowerCase();

    if (sub === "preset" || sub === "p") {
      const presetName = (args[1] || "").toLowerCase();
      if (!PRESETS[presetName]) {
        const list = Object.entries(PRESETS).map(([k, v]) => k + " - " + v.desc).join("\n");
        return m.reply(claraWrap("Audio EQ", [
          "Preset tersedia:",
          list,
          "",
          "Contoh: " + usedPrefix + "audioeq preset rock",
        ].join("\n")));
      }
      const p = PRESETS[presetName];
      bassGain = p.bass;
      midGain = p.mid;
      trebleGain = p.treble;
    } else if (sub === "list") {
      const list = Object.entries(PRESETS).map(([k, v]) => 
        k + " | bass:" + v.bass + " mid:" + v.mid + " treble:" + v.treble + " | " + v.desc
      ).join("\n");
      return m.reply(claraWrap("Audio EQ", ["Presets:", "", list].join("\n")));
    } else {
      bassGain = parseInt(args[0]);
      midGain = parseInt(args[1]);
      trebleGain = parseInt(args[2]);
      if (isNaN(bassGain) || isNaN(midGain) || isNaN(trebleGain)) {
        return m.reply(claraWrap("Audio EQ", [
          "Format: " + usedPrefix + "audioeq <bass> <mid> <treble>",
          "Range: -12 sampai +12 dB",
          "",
          "Contoh: " + usedPrefix + "audioeq 5 -2 8",
          "Atau preset: " + usedPrefix + "audioeq preset rock",
          "Lihat preset: " + usedPrefix + "audioeq list",
        ].join("\n")));
      }
    }

    if (bassGain < -12 || bassGain > 12 || midGain < -12 || midGain > 12 || trebleGain < -12 || trebleGain > 12) {
      return m.reply(claraWrap("Info", "Setiap gain harus -12 sampai +12 dB."));
    }

    const isPtt = !!quoted.pttMessage;
    const tmpDir = path.join(os.tmpdir(), 'nova-eq');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const inputPath = path.join(tmpDir, "input_" + Date.now() + ".ogg");
    const outputPath = path.join(tmpDir, "output_" + Date.now() + ".ogg");

    const buffer = await conn.downloadMediaMessage({ key: { remoteJid: m.key.remoteJid, id: m.quoted && m.quoted.id }, message: quoted });
    fs.writeFileSync(inputPath, buffer);

    // bass ~100Hz, mid ~1000Hz, treble ~5000Hz
    let filter = [
      "bass=g=" + bassGain + ":f=100:w=0.5",
      "equalizer=f=1000:t=q:w=1:g=" + midGain,
      "treble=g=" + trebleGain + ":f=5000:w=0.5",
    ].join(",");

    await queueFFmpeg('ffmpeg -y -i "' + inputPath + '" -af "' + filter + '" -c:a libopus -b:a 64k "' + outputPath + '"');

    if (!fs.existsSync(outputPath)) {
      return m.reply(claraWrap("Audio EQ", "Gagal apply EQ."));
    }

    const buf = fs.readFileSync(outputPath);
    await conn.sendMessage(m.key.remoteJid, {
      audio: buf,
      mimetype: "audio/ogg; codecs=opus",
      ptt: isPtt,
      caption: claraWrap("Audio EQ", [
        "Berhasil!",
        "Bass: " + (bassGain >= 0 ? "+" : "") + bassGain + " dB (100Hz)",
        "Mid: " + (midGain >= 0 ? "+" : "") + midGain + " dB (1kHz)",
        "Treble: " + (trebleGain >= 0 ? "+" : "") + trebleGain + " dB (5kHz)",
      ].join("\n")),
    });

    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
  } catch (e) {
    console.error("audioeq error:", e);
    return m.reply("Error: " + e.message);
  }
}

export { pluginConfig as config, handler };
