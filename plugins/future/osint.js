// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from "axios";

const pluginConfig = {
  name: "osint",
  alias: ["osint"],
  category: "future",
  description: "OSINT username checker - cari username di 20+ platform",
  usage: ".osint <username>",
  example: ".osint aizat",
  isOwner: false,
  isPremium: true,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

const PLATFORMS = [
  { name: "Instagram", url: "https://www.instagram.com/", check: "instagram.com" },
  { name: "Twitter/X", url: "https://x.com/", check: "x.com" },
  { name: "TikTok", url: "https://www.tiktok.com/@", check: "tiktok.com" },
  { name: "YouTube", url: "https://www.youtube.com/@", check: "youtube.com" },
  { name: "GitHub", url: "https://github.com/", check: "github.com" },
  { name: "Reddit", url: "https://www.reddit.com/user/", check: "reddit.com" },
  { name: "Telegram", url: "https://t.me/", check: "t.me" },
  { name: "Facebook", url: "https://www.facebook.com/", check: "facebook.com" },
  { name: "Twitch", url: "https://www.twitch.tv/", check: "twitch.tv" },
  { name: "Spotify", url: "https://open.spotify.com/user/", check: "spotify.com" },
  { name: "Pinterest", url: "https://www.pinterest.com/", check: "pinterest.com" },
  { name: "Medium", url: "https://medium.com/@", check: "medium.com" },
  { name: "SoundCloud", url: "https://soundcloud.com/", check: "soundcloud.com" },
  { name: "Steam", url: "https://steamcommunity.com/id/", check: "steamcommunity.com" },
  { name: "Discord", url: "https://discord.com/users/", check: "discord.com" },
  { name: "Blogger", url: "https://", check: ".blogspot.com" },
  { name: "Wattpad", url: "https://www.wattpad.com/user/", check: "wattpad.com" },
  { name: "GitLab", url: "https://gitlab.com/", check: "gitlab.com" },
  { name: "Snapchat", url: "https://www.snapchat.com/add/", check: "snapchat.com" },
  { name: "Threads", url: "https://www.threads.net/@", check: "threads.net" },
];

async function checkUsername(username) {
  const results = [];
  for (const platform of PLATFORMS) {
    const url = platform.url + username;
    try {
      const res = await axios.head(url, {
        timeout: 5000,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        maxRedirects: 5,
        validateStatus: (s) => s < 500,
      });
      const found = res.status >= 200 && res.status < 404;
      results.push({ name: platform.name, url, found, status: res.status });
    } catch (err) {
      results.push({ name: platform.name, url, found: false, status: "timeout" });
    }
  }
  return results;
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const username = (args[1] || "").replace(/[@]/g, "").trim();

  if (!username) {
    await m.reply(claraWrap("OSINT", [
      "USERNAME CHECKER",
      "",
      "Cari username di " + PLATFORMS.length + "+ platform sekaligus.",
      "",
      "Cara pakai: " + prefix + "osint <username>",
      "Contoh: " + prefix + "osint aizat",
    ].join("\n")));
    return { handled: true };
  }

  if (username.length < 2) {
    await m.reply(claraWrap("OSINT", "Username minimal 2 karakter."));
    return { handled: true };
  }
  await m.reply(claraWrap("OSINT", "Cek @" + username + " di " + PLATFORMS.length + " platform...\nMungkin perlu 10-20 detik."));

  const results = await checkUsername(username);
  const found = results.filter(r => r.found);
  const notFound = results.filter(r => !r.found);

  const foundList = found.length > 0
    ? found.map(r => r.name + " - " + r.url).join("\n")
    : "(tidak ditemukan)";
  const notFoundList = notFound.map(r => r.name).join(", ") || "-";

  await m.reply(claraWrap("OSINT Result: @" + username, [
    "DITEMUKAN (" + found.length + "):",
    foundList,
    "",
    "Tidak ada (" + notFound.length + "):",
    notFoundList,
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler, PLATFORMS };
