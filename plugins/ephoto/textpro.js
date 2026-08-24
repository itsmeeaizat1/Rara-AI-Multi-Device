// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { spawn } from 'child_process'
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "textpro",
  aliases: ["textpro", "texteffect", "tp", "texmaker"],
  category: "ephoto",
  description: "Text effect maker dengan 30+ style (TextPro API gratis)",
  usage: ".textpro <style> <teks> | .textpro list",
  example: ".textpro neon Halo Dunia | .textpro glitch Nova AI | .textpro list",
  isGroupOnly: false,
  cooldown: 10,
}

// TextPro API - free, no key needed (via btch-rest-api or direct)
const TP_API = "https://btch-rest-api.vercel.app/api";

const STYLES = {
  "neon": { endpoint: "/textpro/neon", emoji: "🔴", desc: "Neon light text" },
  "glitch": { endpoint: "/textpro/glitch", emoji: "⚡", desc: "Glitch effect" },
  "devil": { endpoint: "/textpro/devil", emoji: "😈", desc: "Devil text" },
  "transformer": { endpoint: "/textpro/transformer", emoji: "🤖", desc: "Transformer style" },
  "thunder": { endpoint: "/textpro/thunder", emoji: "⛈️", desc: "Thunder text" },
  "stone": { endpoint: "/textpro/stone", emoji: "🪨", desc: "Stone carved text" },
  "lavastone": { endpoint: "/textpro/lavastone", emoji: "🌋", desc: "Lava stone text" },
  "pinkneon": { endpoint: "/textpro/pinkneon", emoji: "💖", desc: "Pink neon text" },
  "typography": { endpoint: "/textpro/typography", emoji: "✍️", desc: "Typography style" },
  "greenneon": { endpoint: "/textpro/greenneon", emoji: "🟢", desc: "Green neon text" },
  "metal": { endpoint: "/textpro/metal", emoji: "🔩", desc: "Metal text" },
  "carbon": { endpoint: "/textpro/carbon", emoji: "⬛", desc: "Carbon fiber text" },
  "gold": { endpoint: "/textpro/gold", emoji: "🥇", desc: "Gold text" },
  "ice": { endpoint: "/textpro/ice", emoji: "🧊", desc: "Ice text" },
  "water": { endpoint: "/textpro/waterpipe", emoji: "💧", desc: "Water pipe text" },
  "sky": { endpoint: "/textpro/sky", emoji: "☁️", desc: "Sky text" },
  "horror": { endpoint: "/textpro/horror", emoji: "🩸", desc: "Horror blood text" },
  "scifi": { endpoint: "/textpro/scifi", emoji: "🛸", desc: "Sci-fi text" },
  "rainbow": { endpoint: "/textpro/rainbow", emoji: "🌈", desc: "Rainbow text" },
  "chrome": { endpoint: "/textpro/chrome", emoji: "🔷", desc: "Chrome text" },
  "glass": { endpoint: "/textpro/glass", emoji: "🔮", desc: "Glass text" },
  "lead": { endpoint: "/textpro/lead", emoji: "🪫", desc: "Lead metal text" },
  "magma": { endpoint: "/textpro/magma", emoji: "🔥", desc: "Magma text" },
  "sandwrite": { endpoint: "/textpro/sandwrite", emoji: "🏖️", desc: "Sand write text" },
  "wooden": { endpoint: "/textpro/wooden", emoji: "🪵", desc: "Wooden text" },
  "halloween": { endpoint: "/textpro/halloween", emoji: "🎃", desc: "Halloween text" },
  "valentine": { endpoint: "/textpro/valentine", emoji: "💝", desc: "Valentine text" },
  "batman": { endpoint: "/textpro/batman", emoji: "🦇", desc: "Batman logo style" },
  "captain": { endpoint: "/textpro/captain", emoji: "🛡️", desc: "Captain America style" },
  "deepsea": { endpoint: "/textpro/deepsea", emoji: "🌊", desc: "Deep sea text" },
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const style = (args[0] || "").toLowerCase().trim();
    const content = args.slice(1).join(" ").trim();

    if (!style || style === "list" || !content) {
      let lines = [];
      lines.push("Text Pro - " + Object.keys(STYLES).length + " Style");
      lines.push("");
      Object.entries(STYLES).forEach(([name, s], i) => {
        lines.push((i + 1) + ". " + s.emoji + " " + name + " - " + s.desc);
      });
      lines.push("");
      lines.push("Cara: " + usedPrefix + "textpro <style> <teks>");
      lines.push("Contoh: " + usedPrefix + "textpro neon Nova AI");
      return m.reply(claraWrap("Text Pro", lines.join("\n")));
    }

    if (!STYLES[style]) {
      return m.reply(claraWrap("Text Pro", "Style tidak ditemukan: " + style + "\nKetik " + usedPrefix + "textpro list"));
    }

    const st = STYLES[style];
    const statusMsg = await conn.sendMessage(m.key.remoteJid, {
      text: claraWrap("Text Pro", "Membuat: " + st.emoji + " " + style + "..."),
    });

    const res = await axios.get(TP_API + st.endpoint, {
      params: { text: content },
      timeout: 15000,
    });

    const imageUrl = res.data?.result || res.data?.url || res.data?.image;
    if (!imageUrl) {
      return m.reply(claraWrap("Text Pro", "Gagal generate text effect."));
    }

    // Download image
    const imgRes = await axios.get(imageUrl, {
      timeout: 15000,
      responseType: 'arraybuffer',
    });

    if (!imgRes.data || imgRes.data.length < 100) {
      return m.reply(claraWrap("Text Pro", "Gagal download gambar."));
    }

    const tmpDir = path.join(os.tmpdir(), 'nova-textpro');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const imgPath = path.join(tmpDir, 'tp_' + Date.now() + '.jpg');
    fs.writeFileSync(imgPath, imgRes.data);

    await conn.sendMessage(m.key.remoteJid, {
      image: fs.readFileSync(imgPath),
      caption: claraWrap("Text Pro", [
        st.emoji + " " + style + " - " + st.desc,
        "Teks: " + content,
      ].join("\n")),
    });

    try { fs.unlinkSync(imgPath); } catch (e) { console.error('[textpro.js]:', e.message); }
    try {
      await conn.sendMessage(m.key.remoteJid, { delete: { remoteJid: m.key.remoteJid, id: statusMsg.key.id, fromMe: true } });
    } catch (e) { console.error('[textpro.js]:', e.message); }
  } catch (e) {
    console.error("textpro error:", e.message);
    return m.reply(claraWrap("Text Pro", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
