// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap, novaGuideV2, novaSalahV2 } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "aihelp",
  alias: ["aihelp"],
  category: "ai",
  description: "Cari command AI berdasarkan keyword",
  usage: ".aihelp <keyword>",
  example: ".aihelp download",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

const AI_COMMANDS = {
  download: { cmds: ["ytmp3", "ytmp4", "igdl", "tiktok", "mediafire", "gdrive"], desc: "Download media dari berbagai platform" },
  sticker: { cmds: ["sticker", "stickerwm", "toimg", "emojimix"], desc: "Buat dan edit sticker" },
  group: { cmds: ["closegc", "opengc", "kick", "add", "promote", "demote", "hidetag"], desc: "Admin grup management" },
  game: { cmds: ["asahotak", "caklontong", "kuis", "tebakbendera", "siapakahaku"], desc: "Game tebak-tebakan" },
  rpg: { cmds: ["rpginventory", "rpgkerja", "rpgquest", "rpgbattle", "rpgshop"], desc: "RPG adventure" },
  ai: { cmds: ["ai", "cegpt", "blackbox", "deepseek", "bardai"], desc: "Chat dengan AI" },
  search: { cmds: ["yts", "google", "pinterest", "wallpaper"], desc: "Cari di internet" },
  tools: { cmds: ["ssweb", "translate", "tts", "qrcode", "calc"], desc: "Tools utility" },
  primbon: { cmds: ["cekjodoh", "cekhoki", "artimimpi", "ramalan"], desc: "Primbon dan ramalan" },
  maker: { cmds: ["ephoto", "textpro", "nulis", "quotemaker"], desc: "Text effect maker" },
  convert: { cmds: ["toimg", "tomp3", "tovideo", "stickerwm"], desc: "Convert format media" },
  nsfw: { cmds: ["xnxx", "xnxx2"], desc: "NSFW content (18+)" },
  owner: { cmds: ["bc", "bcpc", "addprem", "addsewa", "setbot"], desc: "Owner only commands" },
};

async function handler(m, { sock }) {
  await m.react("🕒");
  const prefix = m.prefix || ".";
  const keyword = (m.args[0] || "").toLowerCase().trim();

  if (!keyword) {
    const cats = Object.keys(AI_COMMANDS).map(k => `${prefix}aihelp ${k}`).join("\n");
    return m.reply(novaGuideV2("aihelp", {
 kaomoji: "(◍•ᴗ•◍)",
 sapaan: "mau nyari command AI? tinggal sebut kategorinya! (◕‿◕)",
      cara: "pilih kategori yang mau dilihat daftar commandnya",
      contoh: cats,
      note: `kategori lain: ${Object.keys(AI_COMMANDS).join(", ")}`,
      spec: ["⏱ 5dtk", "💸 gratis"],
    }));
  }

  const match = AI_COMMANDS[keyword];
  if (!match) {
    return m.reply(novaSalahV2("aihelp", { kaomoji: "(・_・;) 😅", pesan: `kategori "${keyword}" gak ada nih kak, coba: download, sticker, group, game, rpg, ai, search, tools~`, contoh: `${prefix}aihelp download` }));
  }

  const cmds = match.cmds.map(c => `${prefix}${c}`).join(" · ");
  await m.react("🐣");
  return m.reply(claraWrap("AI Help", `${match.desc}\n\nCommand:\n${cmds}`));
}

export { pluginConfig as config, handler };
