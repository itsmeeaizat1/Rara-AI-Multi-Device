// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import {  claraWrap } from "../../src/lib/nova-menu-style.js";
import fetch from "node-fetch";
import te from "../../src/lib/nova-error.js";
import config from "../../config.js";

const pluginConfig = {
  name: "izen",
  alias: ["izen"],
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
    return await m.reply(claraWrap("izen", [
      `Bypass link yang ribet ngelewatin iklan, biar langsung ke tujuan akhir.`,
      ``,
      `📌 Format: ${m.prefix}izen <link>`,
      `💡 Contoh: ${m.prefix}izen https://sfl.gl/xxxxx`,
    ]));
  }
  try {
    await m.react("🕒");
    const res = await fetch(`https://anabot.my.id/api/tools/izenLOL?url=${encodeURIComponent(args[0])}&apikey=${config.APIkey.anabot || 'freeApikey'}`);
    const json = await res.json();
    
    if (!json.data?.result?.result) {
       return m.reply(claraWrap("izen", "❌ Waduh kak, gagal ngelewatin link-nya nih! Coba link lain ya."));
    }
    
    const txt = claraWrap("Bypass Link", [
      `*link asli:*`,
      `🔗 ${args[0]}`,
      `*hasil bypass:*`,
      `🚀 ${json.data.result.result}`,
    ]);
    
    await m.react("🐣");
    await m.reply(txt, "izen");
  } catch (e) {
    await m.react("❌");
    m.reply(claraWrap("izen", `❌ Maaf kak, terjadi kesalahan sistem! 😭\nError: ${e.message}`));
  }
}

export { pluginConfig as config, handler };
