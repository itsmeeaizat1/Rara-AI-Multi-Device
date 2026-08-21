// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// allmenu.js — Semua command lengkap per kategori dengan variant tampilan
// Thumbnail: assets/image/nova-thumbnail-allmenu.jpg (via getStaticThumbnail)
import * as botmodePlugin from "../group/botmode.js";
import { generateWAMessageFromContent, prepareWAMessageMedia } from "nova";
import sharp from "sharp";
import {
  getMenuImage,
  getAssetBuffer,
  getStaticThumbnail,
  syncMenuImageFromDb,
} from "../../src/lib/nova-asset-manager.js";
import config from "../../config.js";
import axios from "axios";
import {
  getTimeGreeting,
  formatUptime,
  getImportantDay,
} from "../../src/lib/nova-formatter.js";
import {
  getCommandsByCategory,
  getCategories,
  getPluginCount,
  getPlugin,
  getPluginsByCategory,
} from "../../src/lib/nova-plugins.js";
import { getCasesByCategory, getCaseCount } from "../../case/nova.js";
import fs from "fs";
import path from "path";
import os from "os";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getWeatherAddress, getWeatherFooter } from "../../src/lib/nova-weather-footer.js";
import { isNavButtonsEnabled } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "allmenu",
  alias: ["allmenu", "menuall", "fullmenu"],
  category: "main",
  description: "Menampilkan semua command lengkap per kategori",
  usage: ".allmenu",
  example: ".allmenu",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const CATEGORY_EMOJIS = {
  owner: "👑", main: "🏠", utility: "🔧", fun: "🎮", group: "👥",
  download: "📥", search: "🔍", tools: "🛠️", sticker: "🖼️", ai: "🤖",
  game: "🎯", rpg: "🗡️", media: "🎬", info: "ℹ️", religi: "☪️",
  panel: "🖥️", user: "📊", linode: "☁️", random: "🎲", canvas: "🎨",
  vps: "🌊", store: "🏪", premium: "💎", convert: "🔄", economy: "💰",
  cek: "📋", ephoto: "🎨", jpm: "📢", pushkontak: "📱",
};

// ── Helper: Weton (Javanese 5-day cycle) ──
function getWeton(date = new Date()) {
  const wetonDays = ["Pahing", "Pon", "Wage", "Kliwon", "Legi"];
  const refDate = new Date(1900, 0, 1);
  const diffDays = Math.floor((date.getTime() - refDate.getTime()) / 86400000);
  return wetonDays[((diffDays % 5) + 5) % 5];
}

// ── Helper: Islamic (Hijri) date ──
function getIslamicDate(date = new Date()) {
  try {
    return new Intl.DateTimeFormat("id-ID-u-ca-islamic", {
      day: "numeric", month: "long", year: "numeric",
    }).format(date);
  } catch { return "-"; }
}

// ── Helper: Format bytes ──
function formatBytes(b) {
  return (b / 1024 / 1024 / 1024).toFixed(2) + " GB";
}

// ── Helper: Get command symbols (owner, premium, etc) ──
function getCommandSymbols(cmdName) {
  const plugin = getPlugin(cmdName);
  if (!plugin || !plugin.config) return "";
  const symbols = [];
  if (plugin.config.isOwner) symbols.push("Ⓞ");
  if (plugin.config.isPremium) symbols.push("ⓟ");
  if (plugin.config.limit && plugin.config.limit > 0) symbols.push("Ⓛ");
  if (plugin.config.isAdmin) symbols.push("Ⓐ");
  if (plugin.config.isGroup) symbols.push("Ⓖ");
  if (plugin.config.isPrivate) symbols.push("Ⓟ");
  return symbols.length > 0 ? " " + symbols.join(" ") : "";
}

// ── Category ordering & display names ──
const CATEGORY_ORDER = [
  "ai", "sticker", "download", "fun", "canvas", "tools",
  "game", "rpg", "media", "search", "group", "main",
  "utility", "religi", "info", "cek", "economy", "user",
  "random", "premium", "ephoto", "jpm", "pushkontak",
  "panel", "owner", "store",
];

const CATEGORY_NAMES = {
  ai: "AI", sticker: "Sticker", download: "Download", fun: "Fun",
  canvas: "Canvas", tools: "Tools", game: "Game", rpg: "RPG",
  media: "Media", search: "Search", group: "Group", main: "Main",
  utility: "Utility", religi: "Religi", info: "Info", cek: "Cek",
  economy: "Economy", user: "User", random: "Random", premium: "Premium",
  ephoto: "Ephoto", jpm: "JPM", pushkontak: "Push Kontak",
  panel: "Panel", owner: "Owner", store: "Store",
};

// ── Build category rows for single_select ──
function buildCategoryRows(prefix, m) {
  // Gabungkan kategori dari sistem plugin (aktif) + sistem case (legacy)
  const pluginCats = getCategories();
  const commandsByCategory = getCommandsByCategory();
  const caseCats = getCasesByCategory();
  const allCatKeys = [...new Set([...pluginCats, ...Object.keys(caseCats)])];
  return allCatKeys
    .sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a), ib = CATEGORY_ORDER.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    })
    .filter(cat => {
      if (cat === "owner" && !m.isOwner) return false;
      const total = (commandsByCategory[cat] || []).length + (caseCats[cat] || []).length;
      return total > 0;
    })
    .map(cat => ({
      title: CATEGORY_NAMES[cat] || cat.charAt(0).toUpperCase() + cat.slice(1),
      id: `${prefix}menukategori ${cat}`,
    }));
}

// ── Standard 6-button layout ──
function buildButtons(prefix, includeCategorySelect = false) {
  if (includeCategorySelect) {
    const catRows = buildCategoryRows(prefix, { isOwner: true });
    return [
      { name: "single_select", buttonParamsJson: JSON.stringify({ title: "Kategori", sections: [{ title: "Pilih Kategori", rows: catRows }] }) },
      { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Info Lainnya", id: `${prefix}infov2` }) },
      { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Menu", id: `${prefix}menu` }) },
      { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Tanya AI", id: `${prefix}aihelp` }) },
      { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Rules", id: `${prefix}rules` }) },
      { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Owner", id: `${prefix}owner` }) },
    ];
  }
  return [
    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Kategori", id: `${prefix}menukategori` }) },
    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Info Lainnya", id: `${prefix}infov2` }) },
    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Menu", id: `${prefix}menu` }) },
    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Tanya AI", id: `${prefix}aihelp` }) },
    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Rules", id: `${prefix}rules` }) },
    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Owner", id: `${prefix}owner` }) },
  ];
}

// ── Main handler ──
async function handler(m, { sock, config: botConfig, db, uptime }) {
  await m.react("🕐");
  syncMenuImageFromDb(db);
  const prefix = botConfig.command?.prefix || ".";
  const user = db.getUser(m.sender);
  const timeHelper = await import("../../src/lib/nova-time.js");
  const now = new Date();
  const timeStr = timeHelper.formatTime("HH:mm");
  const dayName = timeHelper.formatFull("dddd");
  const dateStr = timeHelper.formatFull("DD MMMM YYYY");
  const weton = getWeton(now);
  const islamicDate = getIslamicDate(now);
  const importantDay = await getImportantDay(now);

  const groupData = m.isGroup ? db.getGroup(m.chat) || {} : {};
  const botMode = groupData.botMode || "md";
  const categories = getCategories();
  const commandsByCategory = getCommandsByCategory();
  const casesByCategory = getCasesByCategory();
  let totalCommands = 0;
  for (const cat of categories) {
    totalCommands += (commandsByCategory[cat] || []).length;
  }
  const totalCases = getCaseCount();
  const totalFeatures = totalCommands + totalCases;

  let userRole = "User", roleEmoji = "👤";
  if (m.isOwner) { userRole = "Owner"; roleEmoji = "👑"; }
  else if (m.isPremium) { userRole = "Premium"; roleEmoji = "💎"; }

  const greeting = getTimeGreeting();
  const _weatherFooter = await getWeatherFooter().catch(() => null);
  const _weatherBlock = _weatherFooter ? `${_weatherFooter}\n\n` : "";
  const runtimeStr = formatUptime(uptime);
  const platform = process.platform;
  const totalUsers = db.getUserCount();
  const allUsers = db.getAllUsers();
  const totalRegistered = Object.values(allUsers).filter(u => u.registeredAt).length;
  const totalPremium = Object.values(allUsers).filter(u => u.isPremium).length;
  const memUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  const usedMem = totalMem - os.freemem();
  const memPercent = ((usedMem / totalMem) * 100).toFixed(1);
  const cpuModel = os.cpus()[0]?.model || "Unknown";
  const cpuCores = os.cpus().length;
  const cpuSpeed = os.cpus()[0]?.speed || "-";
  const hostname = os.hostname();
  const serverUptime = formatUptime(os.uptime());
  const loadAvg = os.loadavg()[0].toFixed(2);
  const userExp = user?.exp || 0;
  const userLevel = Math.floor(userExp / 20000) + 1;
  const expMin = (userLevel - 1) * 20000;
  const expMax = userLevel * 20000;
  const expCurr = userExp - expMin;

  const more = String.fromCharCode(8206);
  const readMore = more.repeat(4001);

  const botName = config.bot?.name || "Nova AI Whatsapp Bot";
  const botVersion = `v${config.bot?.version || "1.0.0"}`;
  const footerText = `${botName} | Nova Ai WhatsApp Bot`;

  // ── before section (Info User / Waktu / Bot / Server) ──
  let txt = `╔┈┈「 *Info User* 」
╎
╎❏ *Nama:*  ${m.pushName || "User"}
╎❏ *Nomor:* @${m.sender.split("@")[0]}
╎❏ *Premium:* ${m.isPremium ? "Aktif" : "Free"}
╎❏ *Energi:* ${m.isOwner || m.isPremium ? "∞ Unlimited" : (user?.energi ?? 25)}
╎❏ *Koin:* ${(user?.koin ?? 0).toLocaleString()}
╎❏ *Limit:* ${m.isOwner || m.isPremium ? "Unlimited" : (user?.limit ?? "-")}
╎❏ *Role:* ${roleEmoji} ${userRole}
╎❏ *Level:* ${userLevel}
╎❏ *Xp:* ${expCurr.toLocaleString()} / ${(expMax - expMin).toLocaleString()}
╎❏ *Total Xp:* ${userExp.toLocaleString()}
╎❏ *Status:* ${user?.banned ? "Banned" : "Aktif"}
╠┈┈「 *Info Waktu* 」
╎❏ *Waktu:* ${timeStr} WIB
╎❏ *Hari:* ${dayName} ${weton}
╎❏ *Tanggal:* ${dateStr}
╎❏ *Tanggal Islam:* ${islamicDate}
╎❏ *Zona:* Asia/Jakarta
╎❏ *Hari Penting:* ${importantDay}
╠┈┈「 *Info Bot* 」
╎❏ *Bot Name:* ${botConfig.bot?.name || botName}
╎❏ *Bot Nomor:* ${sock?.user?.jid ? sock.user.jid.split("@")[0] : "Unknown"}
╎❏ *Version:* ${botConfig.bot?.version || "-"}
╎❏ *Developer:* ${botConfig.bot?.developer || "-"}
╎❏ *Mode:* ${(botConfig.mode || "public").toUpperCase()}
╎❏ *Prefix:* [ *${prefix}* ]
╎❏ *Uptime:* ${runtimeStr}
╎❏ *Total User:* ${totalUsers}
╎❏ *Total Registrasi:* ${totalRegistered}
╎❏ *Premium User:* ${totalPremium}
╎❏ *Total Fitur:* ${totalFeatures}
╠┈┈「 *Info Server* 」
╎❏ *Platform:* ${platform}
╎❏ *Hostname:* ${hostname}
╎❏ *Type:* Node.Js
╎❏ *Baileys:* Multi Device
╎❏ *Node.js:* ${process.version}
╎❏ *Server Uptime:* ${serverUptime}
╎❏ *CPU:* ${cpuModel}
╎❏ *Cores:* ${cpuCores} threads @ ${cpuSpeed} MHz
╎❏ *Load Avg:* ${loadAvg}
╎❏ *RAM:* ${formatBytes(usedMem)} / ${formatBytes(totalMem)} (${memPercent}%)
╎❏ *RAM Bot:* ${formatBytes(memUsage.rss)}
╚┈┈┈┈┈┈┈┈┈❖
${readMore}
`;

  // ── Keterangan simbol ──
  txt += `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ ALLMENU

  ° ✿ Keterangan ✿ °
  ┊  ➶ Ⓞ = Hanya untuk owner
  ┊  ➶ ⓟ = Hanya untuk premium
  ┊  ➶ Ⓛ = Membutuhkan limit
  ┊  ➶ Ⓐ = Hanya untuk admin
  ┊  ➶ Ⓖ = Hanya di dalam grup
  ┊  ╰➶ Ⓟ = Hanya di private chat

`;

  // ── Category commands (all) ──
  const sortedCategories = [...categories].sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a); const ib = CATEGORY_ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  let modeAllowedMap = { md: null, cpanel: null, store: null, pushkontak: null };
  let modeExcludeMap = { md: ["panel", "pushkontak", "store"], cpanel: null, store: null, pushkontak: null };
  try {
    if (botmodePlugin?.MODES) {
      modeAllowedMap = {}; modeExcludeMap = {};
      for (const [k, v] of Object.entries(botmodePlugin.MODES)) {
        modeAllowedMap[k] = v.allowedCategories;
        modeExcludeMap[k] = v.excludeCategories;
      }
    }
  } catch (e) { console.error('[allmenu.js]:', e.message); }

  const allowedCategories = modeAllowedMap[botMode];
  const excludeCategories = modeExcludeMap[botMode] || [];

  for (const category of sortedCategories) {
    if (category === "owner" && !m.isOwner) continue;
    if (allowedCategories && !allowedCategories.includes(category.toLowerCase())) continue;
    if (excludeCategories && excludeCategories.includes(category.toLowerCase())) continue;
    const pluginCmds = commandsByCategory[category] || [];
    const caseCmds = casesByCategory[category] || [];
    const allCmds = [...pluginCmds, ...caseCmds];
    if (allCmds.length === 0) continue;
    const catName = CATEGORY_NAMES[category] || category.charAt(0).toUpperCase() + category.slice(1);

    txt += `  ° ✿ ${catName} ✿ °\n`;
    for (let i = 0; i < allCmds.length; i++) {
      const cmd = allCmds[i];
      const symbols = getCommandSymbols(cmd);
      const isLast = i === allCmds.length - 1;
      txt += `  ┊  ${isLast ? '╰' : ''}➶ ${prefix}${cmd}${symbols}\n`;
    }
    txt += `\n`;
  }

  txt += `❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀\n`;

  // ── Send ──
  let imageBuffer = null;
  try {
    imageBuffer = await getMenuImage("nova");
  } catch (e) { console.error('[allmenu.js]:', e.message); }

  const savedVariant = db.setting("allmenuVariant");
  const allmenuVariant = savedVariant || botConfig.ui?.allmenuVariant || 3;

  try {
    switch (allmenuVariant) {
      // ── V1: Video/GIF header ──
      case 1: {
        const allmenuVideoUrl = botConfig.ui?.allmenuVideoUrl || config.ui?.allmenuVideoUrl || "";
        let mediaV1;
        if (allmenuVideoUrl && /^https?:\/\//i.test(allmenuVideoUrl)) {
          try {
            const videoRes = await axios.get(allmenuVideoUrl, { responseType: "arraybuffer", timeout: 15000 });
            mediaV1 = await prepareWAMessageMedia(
              { video: Buffer.from(videoRes.data), gifPlayback: true },
              { upload: sock.waUploadToServer },
            );
          } catch (e) {
            const localVid = fs.existsSync(config.assets["nova-mp4"]) ? fs.readFileSync(config.assets["nova-mp4"]) : fs.readFileSync(config.assets["nova"]);
            mediaV1 = await prepareWAMessageMedia(
              { video: localVid, gifPlayback: true },
              { upload: sock.waUploadToServer },
            );
          }
        } else {
          const localVideoPath = fs.existsSync(config.assets["nova-mp4"]) ? config.assets["nova-mp4"] : config.assets["nova"];
          mediaV1 = await prepareWAMessageMedia(
            { video: fs.readFileSync(localVideoPath), gifPlayback: true },
            { upload: sock.waUploadToServer },
          );
        }
        await sock.relayMessage(m.chat, {
          viewOnceMessage: { message: {
            messageContextInfo: {},
            interactiveMessage: {
              header: {
                title: "", subtitle: "",
                hasMediaAttachment: true,
                videoMessage: mediaV1.videoMessage,
              },
              body: { text: _weatherBlock + txt },
              footer: { text: "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀" },
              contextInfo: {
                isForwarded: false, forwardingScore: 9,
                participant: "0@s.whatsapp.net",
                quotedMessage: { conversation: botName },
                mentionedJid: [m.sender],
              },
              nativeFlowMessage: {
                messageParamsJson: JSON.stringify({ limited_time_offer: { text: `${greeting}`, expiration_time: Date.now() + 1000000 } }),
                buttons: buildButtons(prefix),
              },
            },
          } },
        }, {});
        break;
      }

      // ── V2: Location thumbnail header ──
      case 2: {
        const thumbV2All = await getStaticThumbnail("nova-thumbnail-allmenu");
        await sock.relayMessage(m.chat, {
          viewOnceMessage: { message: {
            messageContextInfo: {},
            interactiveMessage: {
              header: {
                title: "", subtitle: "",
                hasMediaAttachment: true,
                locationMessage: {
                  degreesLatitude: 0, degreesLongitude: 0,
                  name: botName,
                  address: botVersion,
                  jpegThumbnail: thumbV2All,
                },
              },
              body: { text: _weatherBlock + txt },
              footer: { text: "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀" },
              contextInfo: {
                isForwarded: false,
                participant: "0@s.whatsapp.net",
                quotedMessage: { conversation: botName },
                mentionedJid: [m.sender],
              },
              nativeFlowMessage: {
                messageParamsJson: JSON.stringify({ limited_time_offer: { text: `${greeting}`, expiration_time: Date.now() + 1000000 } }),
                buttons: buildButtons(prefix),
              },
            },
          } },
        }, {});
        break;
      }

      // ── V3: Location thumbnail + single_select kategori (default) ──
      case 3: {
        const thumbnail = await getStaticThumbnail("nova-thumbnail-allmenu");
        const catRowsAll = buildCategoryRows(prefix, m);
        const msg3 = generateWAMessageFromContent(m.chat, {
          viewOnceMessage: {
            message: {
              messageContextInfo: {},
              interactiveMessage: {
                header: {
                  hasMediaAttachment: true,
                  locationMessage: {
                    degreesLatitude: 0, degreesLongitude: 0,
                    name: botName,
                    address: (await getWeatherAddress()) || botVersion,
                    jpegThumbnail: thumbnail,
                  },
                },
                body: { text: _weatherBlock + txt },
                footer: { text: "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀" },
                contextInfo: { mentionedJid: [m.sender], isForwarded: false },
                nativeFlowMessage: {
                  buttons: buildButtons(prefix, true),
                },
              },
            },
          },
        }, { quoted: m, userJid: sock.user.jid });
        await sock.relayMessage(m.chat, msg3.message, { messageId: msg3.key.id });
        break;
      }

      // ── Default: plain text (claraWrap) ──
      default:
        await m.reply(claraWrap("All Menu", txt));
    }
  } catch (error) {
    console.error("[AllMenu] Error:", error.message);
    let fallbackThumbAll = null;
    try {
      fallbackThumbAll = await getStaticThumbnail("nova-thumbnail-allmenu");
    } catch (e) {
      fallbackThumbAll = imageBuffer || null;
    }
    if (fallbackThumbAll) {
      await sock.sendMessage(m.chat, {
        text: txt,
        contextInfo: {
          mentionedJid: [m.sender],
          isForwarded: false,
          externalAdReply: {
            title: botName,
            body: `BOT WHATSAPP MULTI DEVICE`,
            thumbnail: fallbackThumbAll,
            renderLargerThumbnail: true,
            showAdAttribution: false,
            previewType: "PHOTO",
          },
        },
      }, { quoted: m });
    } else {
      await m.reply(claraWrap("All Menu", txt));
    }
  }

  // ── Audio (independent, runs even if display failed) ──
  try {
    const audioEnabled = db.setting("audioMenu") !== false;
    if (audioEnabled) {
      const audioPath = botConfig.assets["nova-mp3"];
      const audioVariant = db.setting("allmenuAudioStyle") || 1;
      try {
        const tempDir = path.join(process.cwd(), "temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const destPath = path.join(tempDir, "allmenu_audio_opus.ogg");
        if (!fs.existsSync(destPath)) {
          const mp3Path = path.join(tempDir, "allmenu_audio.mp3");
          fs.copyFileSync(audioPath, mp3Path);
          const { spawn } = await import("child_process");
          await new Promise((resolve, reject) => {
            const ffmpeg = spawn("ffmpeg", ["-y", "-i", mp3Path, "-c:a", "libopus", "-b:a", "128k", "-vbr", "on", "-application", "audio", "-ar", "48000", destPath]);
            ffmpeg.on("close", (code) => { if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path); if (code === 0) resolve(); else reject(new Error("FFmpeg error")); });
            ffmpeg.on("error", (err) => { if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path); reject(err); });
          });
        }
        await sock.sendMessage(m.chat, {
          audio: { url: destPath },
          mimetype: "audio/ogg; codecs=opus",
          ptt: true,
        }, { quoted: m });
      } catch {
        await sock.sendMessage(m.chat, {
          audio: { url: audioPath },
          mimetype: "audio/mpeg",
          ptt: false,
        }, { quoted: m });
      }
    }
  } catch (e) { console.error("[AllMenu] Error sending audio:", e.message); }

  await m.react("✅");
}

export { pluginConfig as config, handler };
