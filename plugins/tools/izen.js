// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import {  claraWrap } from "../../src/lib/nova-menu-style.js";
import fetch from "node-fetch";
import te from "../../src/lib/nova-error.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import config from "../../config.js";

const pluginConfig = {
  name: "izen",
  alias: ["skiplink", "izen"],
  category: "tools",
  description: "Bypass shortlink / skiplink menggunakan izen",
  usage: ".izen link",
  example: ".izen https://sfl.gl/xxxxx",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { args, sock }) {
  if (!args[0]) {
    let txt = `🔗 *SKIPLINK BYPASS* 🔗\n\n`;
    txt += `Halo kak! Punya link yang ribet ngelewatin iklan? Sini aku bantu lewatin biar langsung ke tujuan akhir!\n\n`;
    txt += `*Cara Pakai:*\n`;
    txt += `👉 \`${m.prefix}izen <link>\`\n\n`;
    txt += `*Contoh:*\n`;
    txt += `👉 \`${m.prefix}izen https://sfl.gl/xxxxx\``;
    return await m.reply(claraWrap("izen", txt));
  }

  await m.react("🕐");
  
  try {
    const res = await fetch(`https://anabot.my.id/api/tools/izenLOL?url=${encodeURIComponent(args[0])}&apikey=${config.APIkey.anabot || 'freeApikey'}`);
    const json = await res.json();
    
    if (!json.data?.result?.result) {
       return m.reply(claraWrap("izen", "❌ Waduh kak, gagal ngelewatin link-nya nih! Coba link lain ya."));
    }
    
    const txt = claraWrap("Bypass Link", [
      `*Link Asli:*`,
      `🔗 ${args[0]}`,
      `*Hasil Bypass:*`,
      `🚀 ${json.data.result.result}`,
    ]);
    
    await m.reply(claraWrap("izen", txt));
    await m.react("✅");
  } catch (e) {
    m.reply(claraWrap("izen", `❌ Maaf kak, terjadi kesalahan sistem! 😭\nError: ${e.message}`));
  }
}

export { pluginConfig as config, handler };
