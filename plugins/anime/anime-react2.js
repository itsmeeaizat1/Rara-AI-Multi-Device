// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";

// Reactions yang BELUM ada di anime-react.js (V1)
const RX_MAP = {
  animeawoo: { api: "waifu", cat: "awoo", label: "Awoo~" },
  animebonk: { api: "waifu", cat: "bonk", label: "Bonk!" },
  animebully: { api: "waifu", cat: "bully", label: "Bully" },
  animecringe: { api: "waifu", cat: "cringe", label: "Cringe" },
  animeglomp: { api: "waifu", cat: "glomp", label: "Glomp!" },
  animekill: { api: "waifu", cat: "kill", label: "Kill" },
  animelick: { api: "waifu", cat: "lick", label: "Lick" },
  animemegumin: { api: "waifu", cat: "megumin", label: "Megumin!" },
  animeshinobu: { api: "waifu", cat: "shinobu", label: "Shinobu~" },
  animesmug: { api: "waifu", cat: "smug", label: "Smug" },
  animesmug2: { api: "waifu", cat: "smug", label: "Smug" },
  animespank: { api: "waifu", cat: "spank", label: "Spank!" },
  animetickle: { api: "waifu", cat: "tickle", label: "Tickle!" },
  animetickle2: { api: "waifu", cat: "tickle", label: "Tickle!" },
  animeyeet: { api: "waifu", cat: "yeet", label: "Yeet!" },
  animecuddle: { api: "waifu", cat: "cuddle", label: "Cuddle~" },
  animewaifu2: { api: "waifu", cat: "waifu", label: "Waifu~" },
  animesmile: { api: "waifu", cat: "smile", label: "Smile~" },
  animefeed: { api: "nekos", cat: "feed", label: "Feed~" },
  animefoxgirl: { api: "nekos", cat: "fox_girl", label: "Fox Girl~" },
  animegecg: { api: "nekos", cat: "gecg", label: "GECG" },
  animegoose: { api: "nekos", cat: "goose", label: "Goose!" },
  animelizard: { api: "nekos", cat: "lizard", label: "Random lizard" },
  animemeow: { api: "nekos", cat: "meow", label: "Meow~" },
  animewoof: { api: "nekos", cat: "woof", label: "Woof!" },
  animeavatar: { api: "nekos", cat: "avatar", label: "Anime Avatar" },
  animewallpaper2: { api: "nekos", cat: "wallpaper", label: "Anime Wallpaper" },
  anime8ball: { api: "nekos", cat: "8ball", label: "8ball" },
};

const pluginConfig = {
  name: "animeawoo",
  alias: Object.keys(RX_MAP),
  category: "anime",
  description: "Anime reaction GIF V2 (awoo, bonk, bully, cringe, glomp, kill, lick, megumin, shinobu, smug, spank, tickle, yeet, cuddle, smile, feed, foxgirl, gecg, goose, lizard, meow, woof, avatar, wallpaper, 8ball)",
  usage: ".animeawoo @tag (atau .animebonk, .animekill, .animelick, dll)",
  example: ".animebonk @628xxx",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const cmd = m.command || "animeawoo";
    const rx = RX_MAP[cmd] || RX_MAP["animeawoo"];
    const from = m.key.remoteJid;

    await sock.sendMessage(from, { react: { text: "🕒", key: m.key } });

    let url;
    if (rx.api === "waifu") {
      const res = await axios.get(`https://api.waifu.pics/sfw/${rx.cat}`);
      url = res.data?.url;
    } else {
      const res = await axios.get(`https://nekos.life/api/v2/img/${rx.cat}`);
      url = res.data?.url;
    }

    if (!url) {
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      return m.reply(raraWrap(cmd, te(m.prefix, m.command, m.pushName), "error"));
    }

    // Cek jika disebut seseorang
    const mentioned = m.quoted?.sender || (m.mentionedJid?.length ? m.mentionedJid[0] : null);
    let caption = rx.label;
    if (mentioned && mentioned !== m.sender) {
      const targetName = mentioned.split("@")[0];
      caption = `@${m.sender.split("@")[0]} ${rx.label} @${targetName}`;
    }

    await sock.sendMessage(from, {
      image: { url },
      caption: caption,
      mentions: mentioned ? [mentioned, m.sender] : []
    }, { quoted: m });

    await sock.sendMessage(from, { react: { text: "🐣", key: m.key } });
  } catch (err) {
    const from = m.key.remoteJid;
    console.error("anime-react2 error:", err);
    await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
    return m.reply(raraWrap(m.command, te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
