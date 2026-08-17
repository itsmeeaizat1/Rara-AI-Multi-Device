// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import * as botmodePlugin from "../group/botmode.js";
import { generateWAMessageFromContent, prepareWAMessageMedia, proto } from "nova";
import _sharp from "sharp";
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
import { getDatabase } from "../../src/lib/nova-database.js";
import fs from "fs";
import path from "path";
import os from "os";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { getWeatherAddress } from "../../src/lib/nova-weather-footer.js";

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

// ── Weton (Javanese 5-day cycle) ──
function getWeton(date = new Date()) {
  const wetonDays = ["Pahing", "Pon", "Wage", "Kliwon", "Legi"];
  const refDate = new Date(1900, 0, 1);
  const diffDays = Math.floor((date.getTime() - refDate.getTime()) / 86400000);
  return wetonDays[((diffDays % 5) + 5) % 5];
}

// ── Islamic (Hijri) date ──
function getIslamicDate(date = new Date()) {
  try {
    return new Intl.DateTimeFormat("id-ID-u-ca-islamic", {
      day: "numeric", month: "long", year: "numeric",
    }).format(date);
  } catch { return "-"; }
}

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

async function handler(m, { sock, config: botConfig, db, uptime }) {
  await m.react("🕐");
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
  const runtimeStr = formatUptime(uptime);
  const platform = process.platform;
  const totalUsers = db.getUserCount();
  const allUsers = db.getAllUsers();
  const totalRegistered = Object.values(allUsers).filter(u => u.registeredAt).length;
  const totalPremium = Object.values(allUsers).filter(u => u.isPremium).length;
  const memUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memPercent = ((usedMem / totalMem) * 100).toFixed(1);
  const cpuModel = os.cpus()[0]?.model || "Unknown";
  const cpuCores = os.cpus().length;
  const cpuSpeed = os.cpus()[0]?.speed || "-";
  const hostname = os.hostname();
  const serverUptime = formatUptime(os.uptime());
  const loadAvg = os.loadavg()[0].toFixed(2);
  const formatBytes = (b) => (b / 1024 / 1024 / 1024).toFixed(2) + " GB";
  const userExp = user?.exp || 0;
  const userLevel = Math.floor(userExp / 20000) + 1;
  const expMin = (userLevel - 1) * 20000;
  const expMax = userLevel * 20000;
  const expCurr = userExp - expMin;

  // readmore trick
  const more = String.fromCharCode(8206);
  const readMore = more.repeat(4001);

  // ── before section (Info User / Info Waktu / Info Bot / Info Server) ──
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
╎❏ *Bot Name:* ${botConfig.bot?.name || "Nova-AI"}
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
  txt += `╔┈┈「 *Keterangan* 」
╎
╎❏ Ⓞ = Hanya untuk owner
╎❏ ⓟ = Hanya untuk premium
╎❏ Ⓛ = Membutuhkan limit
╎❏ Ⓐ = Hanya untuk admin
╎❏ Ⓖ = Hanya di dalam grup
╎❏ Ⓟ = Hanya di private chat
╚┈┈┈┈┈┈┈┈┈❖
`;

  // ── Category commands (all) ──
  const categoryOrder = [
    "ai", "sticker", "download", "fun", "canvas", "tools",
    "game", "rpg", "media", "search", "group", "main",
    "utility", "religi", "info", "cek", "economy", "user",
    "random", "premium", "ephoto", "jpm", "pushkontak",
    "panel", "owner", "store",
  ];
  const sortedCategories = [...categories].sort((a, b) => {
    const ia = categoryOrder.indexOf(a); const ib = categoryOrder.indexOf(b);
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
  } catch (e) {}
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
    const emoji = CATEGORY_EMOJIS[category] || "📋";

    // header: ╔┈「 %category 」
    txt += `╔┈「 ${emoji} *${category}* 」\n`;
    // body: ╎ぎ %cmd
    for (const cmd of allCmds) {
      const symbols = getCommandSymbols(cmd);
      txt += `╎ぎ ${prefix}${cmd}${symbols}\n`;
    }
    // footer: ╚┈┈┈┈┈┈┈┈┈❖
    txt += `╚┈┈┈┈┈┈┈┈┈❖\n\n`;
  }

  // ── Send ──
  let imageBuffer = null;
  try {
    imageBuffer = fs.readFileSync(botConfig.assets["nova"]);
  } catch (e) {}

  const savedVariant = db.setting("allmenuVariant");
  const allmenuVariant = savedVariant || botConfig.ui?.allmenuVariant || 3;
  try {
    switch (allmenuVariant) {
      case 1: {
        // V1: Video/GIF header - support URL or local file
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
            console.error("[AllMenu V1] Video URL fetch failed:", e.message);
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
          viewOnceMessage: {
            message: {
              messageContextInfo: {},
              interactiveMessage: {
                header: {
                  title: "", subtitle: "",
                  hasMediaAttachment: true,
                  videoMessage: mediaV1.videoMessage,
                },
                body: { text: txt },
                footer: {
                  text: "🌸 Pilih tombol dibawah untuk kembali ke menu~",
                },
                contextInfo: {
                  isForwarded: false,
                  forwardingScore: 9,
                  participant: "0@s.whatsapp.net",
                  quotedMessage: { conversation: `${config.bot?.name}` },
                  mentionedJid: [m.sender],
                },
                nativeFlowMessage: {
                  messageParamsJson: JSON.stringify({
                    limited_time_offer: { text: `${greeting}`, expiration_time: Date.now() + 1000000 },
                  }),
                  buttons: [
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Kategori", id: `${prefix}menukategori` }) },
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Info Lainnya", id: `${prefix}infov2` }) },
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Menu", id: `${prefix}menu` }) },
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Tanya AI", id: `${prefix}aihelp` }) },
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Rules", id: `${prefix}rules` }) },
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Owner", id: `${prefix}owner` }) },
                  ],
                },
              },
            },
          },
        }, {});
        break;
      }
      case 2: {
        const thumbV2All = await _sharp(fs.readFileSync(config.assets["nova"])).resize(640, 360).toBuffer();
        await sock.relayMessage(m.chat, {
          viewOnceMessage: {
            message: {
              messageContextInfo: {},
              interactiveMessage: {
                header: {
                  title: "", subtitle: "",
                  hasMediaAttachment: true,
                  locationMessage: {
                    degreesLatitude: 0, degreesLongitude: 0,
                    name: config.bot?.name || "Nova-AI",
                    address: `v${config.bot?.version || "1.0.0"}`,
                    jpegThumbnail: thumbV2All,
                  },
                },
                body: { text: txt },
                footer: {
                  text: "🌸 Pilih tombol dibawah untuk kembali ke menu~",
                },
                contextInfo: {
                  isForwarded: false,
                  forwardingScore: 9,
                  participant: "0@s.whatsapp.net",
                  quotedMessage: { conversation: `${config.bot?.name}` },
                  mentionedJid: [m.sender],
                },
                nativeFlowMessage: {
                  messageParamsJson: JSON.stringify({
                    limited_time_offer: { text: `${greeting}`, expiration_time: Date.now() + 1000000 },
                  }),
                  buttons: [
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Kategori", id: `${prefix}menukategori` }) },
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Info Lainnya", id: `${prefix}infov2` }) },
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Menu", id: `${prefix}menu` }) },
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Tanya AI", id: `${prefix}aihelp` }) },
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Rules", id: `${prefix}rules` }) },
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Owner", id: `${prefix}owner` }) },
                  ],
                },
              },
            },
          },
        }, {});
        break;
      }
      case 3: {
        const thumbnail = await _sharp(fs.readFileSync(config.assets["nova"])).resize(640, 360).toBuffer();
        const msg3 = generateWAMessageFromContent(m.chat, {
          viewOnceMessage: {
            message: {
              messageContextInfo: {},
              interactiveMessage: {
                header: {
                  hasMediaAttachment: true,
                  locationMessage: {
                    degreesLatitude: 0, degreesLongitude: 0,
                    name: config.bot?.name || "Nova-AI",
                    address: (await getWeatherAddress()) || `v${config.bot?.version || "1.0.0"}`,
                    jpegThumbnail: thumbnail,
                  },
                },
                body: { text: txt },
                footer: { text: `🌸 ${config.bot?.name} | Nova Ai WhatsApp Bot` },
                contextInfo: {
                  mentionedJid: [m.sender],
                  isForwarded: false,
                  forwardingScore: 9,
                },
                nativeFlowMessage: {
                  buttons: [
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Kategori", id: `${prefix}menukategori` }) },
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Info Lainnya", id: `${prefix}infov2` }) },
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Menu", id: `${prefix}menu` }) },
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Tanya AI", id: `${prefix}aihelp` }) },
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Rules", id: `${prefix}rules` }) },
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Owner", id: `${prefix}owner` }) },
                  ],
                },
              },
            },
          },
        }, { quoted: m, userJid: sock.user.jid });
        await sock.relayMessage(m.chat, msg3.message, { messageId: msg3.key.id });
        break;
      }
      default:
        await m.reply(claraWrap("allmenu", txt));
    }
  } catch (error) {
    console.error("[AllMenu] Error:", error.message);
    let fallbackThumbAll = null;
    try {
      fallbackThumbAll = imageBuffer ? await _sharp(imageBuffer).resize(640, 360, { fit: "cover" }).toBuffer() : null;
    } catch (e) {
      fallbackThumbAll = imageBuffer || null;
    }
    if (fallbackThumbAll) {
      await sock.sendMessage(m.chat, {
        text: txt,
        contextInfo: {
          mentionedJid: [m.sender],
          forwardingScore: 9,
          isForwarded: false,
          externalAdReply: {
            title: config.bot?.name || "Nova-AI",
            body: `BOT WHATSAPP MULTI DEVICE`,
            thumbnail: fallbackThumbAll,
            renderLargerThumbnail: true,
            showAdAttribution: false,
            previewType: "VIDEO",
          },
        },
      }, { quoted: m });
    } else {
      await m.reply(claraWrap("allmenu", txt));
    }
  }

  // ── Audio (independent try-catch, runs even if menu display failed) ──
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
            const ffmpeg = spawn("ffmpeg", ["-y", "-i", mp3Path, "-c:a", "libopus", "-b:a", "48k", "-vbr", "on", destPath]);
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
