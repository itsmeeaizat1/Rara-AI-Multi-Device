// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { toVoiceNote } from "../../src/lib/nova-ffmpeg.js";
import { novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "soundboard",
  alias: ["soundboard", "sfx"],
  aliases: ["soundboard", "sfx", "soundfx", "boardfx"],
  category: "media",
  description: "Sound effect board (anime, meme, button, bruh, dll) - kirim VN sound effect",
  usage: ".sfx <nama> | .sfx list",
  example: ".sfx bruh | .sfx anime wow | .sfx list",
  isGroupOnly: false,
  cooldown: 5,
}

// Free sound effects from MyInstants.com (direct MP3 URLs)
const SOUNDS = {
  "bruh": { url: "https://www.myinstants.com/media/sounds/bruh.mp3", emoji: "💀" },
  "wow": { url: "https://www.myinstants.com/media/sounds/wow.mp3", emoji: "😮" },
  "sadtrombone": { url: "https://www.myinstants.com/media/sounds/sadtrombone.mp3", emoji: "🎺" },
  "crickets": { url: "https://www.myinstants.com/media/sounds/crickets.mp3", emoji: "🦗" },
  "fbi": { url: "https://www.myinstants.com/media/sounds/fbi-open-up.mp3", emoji: "🚨" },
  "bonk": { url: "https://www.myinstants.com/media/sounds/bonk-sound-effect.mp3", emoji: "🔨" },
  "yeet": { url: "https://www.myinstants.com/media/sounds/yeet.mp3", emoji: "🚀" },
  "oof": { url: "https://www.myinstants.com/media/sounds/oof.mp3", emoji: "😵" },
  "vineboom": { url: "https://www.myinstants.com/media/sounds/vine-boom.mp3", emoji: "💥" },
  "degla": { url: "https://www.myinstants.com/media/sounds/degladegla.mp3", emoji: "🔇" },
  "naruto": { url: "https://www.myinstants.com/media/sounds/naruto.mp3", emoji: "🍥" },
  "kawaii": { url: "https://www.myinstants.com/media/sounds/kawaii.mp3", emoji: "✨" },
  "niconico": { url: "https://www.myinstants.com/media/sounds/niconiconii.mp3", emoji: "🎵" },
  "sugoi": { url: "https://www.myinstants.com/media/sounds/sugoi.mp3", emoji: "🔥" },
  "laugh": { url: "https://www.myinstants.com/media/sounds/laugh.mp3", emoji: "😂" },
  "clap": { url: "https://www.myinstants.com/media/sounds/clap.mp3", emoji: "👏" },
  "airhorn": { url: "https://www.myinstants.com/media/sounds/airhorn.mp3", emoji: "📯" },
  "rizz": { url: "https://www.myinstants.com/media/sounds/rizz.mp3", emoji: "😏" },
  "spongebob": { url: "https://www.myinstants.com/media/sounds/spongebob-fail.mp3", emoji: "🧽" },
  "error": { url: "https://www.myinstants.com/media/sounds/error.mp3", emoji: "⚠️" },
  "bell": { url: "https://www.myinstants.com/media/sounds/bell.mp3", emoji: "🔔" },
  "tada": { url: "https://www.myinstants.com/media/sounds/tada.mp3", emoji: "🎉" },
  "suspense": { url: "https://www.myinstants.com/media/sounds/suspense.mp3", emoji: "🎭" },
  "tada3": { url: "https://www.myinstants.com/media/sounds/tada-fanfare.mp3", emoji: "🎺" },
  "discord": { url: "https://www.myinstants.com/media/sounds/discord-notification.mp3", emoji: "💬" },
  "victory": { url: "https://www.myinstants.com/media/sounds/victory-fanfare.mp3", emoji: "🏆" },
  "gameover": { url: "https://www.myinstants.com/media/sounds/game-over.mp3", emoji: "🎮" },
  "coin": { url: "https://www.myinstants.com/media/sounds/coin.mp3", emoji: "🪙" },
  "button": { url: "https://www.myinstants.com/media/sounds/button-press.mp3", emoji: "🔘" },
  "boom": { url: "https://www.myinstants.com/media/sounds/explosion.mp3", emoji: "💣" },
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = (args[0] || "").toLowerCase().trim();

    if (!input || input === "list" || input === "menu") {
      let lines = [];
      lines.push("Sound Board - " + Object.keys(SOUNDS).length + " Sound Effects");
      lines.push("");
      Object.entries(SOUNDS).forEach(([name, s], i) => {
        lines.push((i + 1) + ". " + s.emoji + " " + name);
      });
      lines.push("");
      lines.push("Cara: " + usedPrefix + "sfx <nama>");
      lines.push("Contoh: " + usedPrefix + "sfx bruh");
      return m.reply(claraWrap("Sound Board", lines.join("\n")));
    }

    if (!SOUNDS[input]) {
      return m.reply(claraWrap("Sound Board", "Sound tidak ditemukan: " + input + "\nKetik " + usedPrefix + "sfx list untuk lihat semua."));
    }

    const sound = SOUNDS[input];
    const statusMsg = await conn.sendMessage(m.key.remoteJid, {
      text: claraWrap("Sound Board", "Mengirim: " + sound.emoji + " " + input + "..."),
    });

    // Download sound
    const res = await axios.get(sound.url, {
      timeout: 15000,
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!res.data || res.data.length < 100) {
      return m.reply(claraWrap("Sound Board", "Gagal download sound. Coba lagi."));
    }

    // Save and send as voice note
    const tmpDir = path.join(os.tmpdir(), 'nova-sfx');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const outPath = path.join(tmpDir, 'sfx_' + Date.now() + '.mp3');
    fs.writeFileSync(outPath, res.data);

    const audioBuf = fs.readFileSync(outPath);
    await conn.sendMessage(m.key.remoteJid, {
      audio: await toVoiceNote(audioBuf),
      mimetype: 'audio/ogg; codecs=opus',
      ptt: true,
      caption: claraWrap("Sound Board", sound.emoji + " " + input),
    });

    try { fs.unlinkSync(outPath); } catch (e) { console.error('[soundboard.js]:', e.message); }
    try {
      await conn.sendMessage(m.key.remoteJid, { delete: { remoteJid: m.key.remoteJid, id: statusMsg.key.id, fromMe: true } });
    } catch (e) { console.error('[soundboard.js]:', e.message); }
  } catch (e) {
    console.error("soundboard error:", e.message);
    return m.reply(claraWrap("Sound Board", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
