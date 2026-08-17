// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getCaseCount, getCasesByCategory } from "../../case/nova.js";
import {
  prepareWAMessageMedia,
  generateWAMessageFromContent,
  proto,
} from "nova";
import _sharp from "sharp";
import { getMenuImage, getMenuThumbnail, getAssetBuffer, syncMenuImageFromDb } from "../../src/lib/nova-asset-manager.js";
import config from "../../config.js";
import {
  getImportantDay,
  formatUptime,
  getTimeGreeting,
} from "../../src/lib/nova-formatter.js";
import { formatTime as fmtTime, formatFull as fmtFull } from "../../src/lib/nova-time.js";
import {
  getCommandsByCategory,
  getCategories,
} from "../../src/lib/nova-plugins.js";
import fs from "fs";
import os from "os";
import path from "path";

function getSharp() {
  return _sharp;
}
import axios from "axios";
import sharp from "sharp";
import { getWeatherAddress } from "../../src/lib/nova-weather-footer.js";
import {
  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "menu",
  alias: ["help", "bantuan", "commands", "m"],
  category: "main",
  description: "Menampilkan menu utama bot",
  usage: ".menu",
  example: ".menu",
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


// ── Build menu text (defaultMenu template) ──
async function buildMenuText(m, botConfig, db, uptime, sock) {
  const prefix = botConfig.command?.prefix || ".";
  const user = db.getUser(m.sender);
  const now = new Date();
  const timeStr = fmtTime("HH:mm");
  const dayName = fmtFull("dddd");
  const dateStr = fmtFull("DD MMMM YYYY");
  const weton = getWeton(now);
  const islamicDate = getIslamicDate(now);
  const importantDay = await getImportantDay(now);

  let userRole = "User", roleEmoji = "👤";
  if (m.isOwner) { userRole = "Owner"; roleEmoji = "👑"; }
  else if (m.isPremium) { userRole = "Premium"; roleEmoji = "💎"; }

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
  const runtimeStr = formatUptime(uptime);
  const platform = process.platform;

  const more = String.fromCharCode(8206);
  const readMore = more.repeat(4001);

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
╔┈「 *Menu* 」
╎ぎ ${prefix}menu
╎ぎ ${prefix}allmenu
╎ぎ ${prefix}tanyaai
╚┈┈┈┈┈┈┈┈┈❖
`;
  return txt;
}

function getContextInfo(botConfig, m, thumbBuffer, renderLargerThumbnail = false) {
  const saluranId = botConfig.saluran?.id || "120363400911374213@newsletter";
  const saluranName = botConfig.saluran?.name || botConfig.bot?.name || "Nova-AI";
  const saluranLink = botConfig.saluran?.link || "";
  const ctx = {
    mentionedJid: [m.sender],
    forwardingScore: 9,
    isForwarded: false,
    externalAdReply: {
      title: botConfig.bot?.name || "Nova-AI",
      body: `BOT WHATSAPP MULTI DEVICE`,
      sourceUrl: saluranLink,
      previewType: "VIDEO",
      showAdAttribution: false,
      renderLargerThumbnail,
    },
  };
  if (thumbBuffer) ctx.externalAdReply.thumbnail = thumbBuffer;
  return ctx;
}

function getVerifiedQuoted(botConfig, m) {
  if (m) {
    return {
      key: { participant: `${m.sender}`, remoteJid: `status@broadcast` },
      message: {
        contactMessage: {
          displayName: `🍂 Yth. ${m.pushName}`,
          vcard: `BEGIN:VCARD\nVERSION:3.0\nN:XL;ttname,;;;\nFN:ttname\nitem1.TEL;waid=${m.sender.split("@")[0]}:${m.sender.split("@")[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`,
          sendEphemeral: true,
        },
      },
    };
  }
  return {
    key: { participant: `0@s.whatsapp.net`, remoteJid: `status@broadcast` },
    message: {
      contactMessage: {
        displayName: `🪸 ${botConfig.bot?.name}`,
        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:XL;ttname,;;;\nFN:ttname\nitem1.TEL;waid=13135550002:+1 (313) 555-0002\nitem1.X-ABLabel:Ponsel\nEND:VCARD`,
        sendEphemeral: true,
      },
    },
  };
}

async function handler(m, { sock, config: botConfig, db, uptime }) {
  await m.react("🕐");
  syncMenuImageFromDb(db);
  const prefix = botConfig.command?.prefix || ".";
  const savedVariant = db.setting("menuVariant");
  const menuVariant = savedVariant || botConfig.ui?.menuVariant || 3;
  const groupData = m.isGroup ? db.getGroup(m.chat) || {} : {};
  const botMode = groupData.botMode || "md";
  const text = await buildMenuText(m, botConfig, db, uptime, sock);

  let imageBuffer = null;
  let thumbBuffer = null;
  try {
    imageBuffer = await getMenuImage("nova");
    thumbBuffer = getAssetBuffer("nova2");
  } catch (e) { console.error("Gagal load assets:", e.message); }

  const saluranId = botConfig.saluran?.id || "120363400911374213@newsletter";
  const saluranName = botConfig.saluran?.name || botConfig.bot?.name || "Nova-AI";
  const greeting = getTimeGreeting();


  try {
    switch (menuVariant) {
      case 1: {
        // V1: Video/GIF header - support URL or local file
        const menuVideoUrl = botConfig.ui?.menuVideoUrl || config.ui?.menuVideoUrl || "";
        let mediaV1;
        if (menuVideoUrl && /^https?:\/\//i.test(menuVideoUrl)) {
          // Load from URL
          try {
            const { default: axios } = await import("axios");
            const videoRes = await axios.get(menuVideoUrl, { responseType: "arraybuffer", timeout: 15000 });
            mediaV1 = await prepareWAMessageMedia(
              { video: Buffer.from(videoRes.data), gifPlayback: true },
              { upload: sock.waUploadToServer },
            );
          } catch (e) {
            console.error("[Menu V1] Video URL fetch failed:", e.message);
            // Fallback to local file
            const localVid = fs.existsSync(config.assets["nova-mp4"]) ? fs.readFileSync(config.assets["nova-mp4"]) : fs.readFileSync(config.assets["nova"]);
            mediaV1 = await prepareWAMessageMedia(
              { video: localVid, gifPlayback: true },
              { upload: sock.waUploadToServer },
            );
          }
        } else {
          // Load from local file (assets/video/)
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
              body: { text },
              footer: { text: `🌸 ${config.bot?.name} | Nova Ai WhatsApp Bot` },
              contextInfo: {
                isForwarded: false, forwardingScore: 9,
                participant: "0@s.whatsapp.net",
                quotedMessage: { conversation: `${config.bot?.name}` },
                mentionedJid: [m.sender],
              },
              nativeFlowMessage: {
                messageParamsJson: JSON.stringify({ limited_time_offer: { text: `${greeting}`, expiration_time: Date.now() + 1000000 } }),
                buttons: [
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Kategori", id: `${prefix}menukategori` }) },
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Info Lainnya", id: `${prefix}infov2` }) },
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "All Menu", id: `${prefix}allmenu` }) },
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Tanya AI", id: `${prefix}aihelp` }) },
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Rules", id: `${prefix}rules` }) },
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Owner", id: `${prefix}owner` }) },
                ],
              },
            },
          } },
        }, {});
        break;
      }

      case 2: {
        const thumbV2 = await getMenuThumbnail("nova");
        await sock.relayMessage(m.chat, {
          viewOnceMessage: { message: {
            messageContextInfo: {},
            interactiveMessage: {
              header: {
                title: "", subtitle: "",
                hasMediaAttachment: true,
                locationMessage: {
                  degreesLatitude: 0, degreesLongitude: 0,
                  name: config.bot?.name || "Nova-AI",
                  address: `v${config.bot?.version || "1.0.0"}`,
                  jpegThumbnail: thumbV2,
                },
              },
              body: { text },
              footer: { text: `🌸 ${config.bot?.name} | Nova Ai WhatsApp Bot` },
              contextInfo: {
                isForwarded: false, forwardingScore: 9,
                participant: "0@s.whatsapp.net",
                quotedMessage: { conversation: `${config.bot?.name}` },
                mentionedJid: [m.sender],
              },
              nativeFlowMessage: {
                messageParamsJson: JSON.stringify({ limited_time_offer: { text: `${greeting}`, expiration_time: Date.now() + 1000000 } }),
                buttons: [
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Kategori", id: `${prefix}menukategori` }) },
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Info Lainnya", id: `${prefix}infov2` }) },
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "All Menu", id: `${prefix}allmenu` }) },
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Tanya AI", id: `${prefix}aihelp` }) },
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Rules", id: `${prefix}rules` }) },
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Owner", id: `${prefix}owner` }) },
                ],
              },
            },
          } },
        }, {});
        break;
      }

      case 3: {
        const thumbV3 = await getMenuThumbnail("nova");
        // Build kategori popup dari case system
        const allCats = getCasesByCategory();
        const categoryOrder = [
          "ai", "sticker", "download", "fun", "canvas", "tools",
          "game", "rpg", "media", "search", "group", "main",
          "utility", "religi", "info", "cek", "economy", "user",
          "random", "premium", "ephoto", "jpm", "pushkontak",
          "panel", "owner", "store",
        ];
        const catNames = {
          ai: "AI", sticker: "Sticker", download: "Download", fun: "Fun",
          canvas: "Canvas", tools: "Tools", game: "Game", rpg: "RPG",
          media: "Media", search: "Search", group: "Group", main: "Main",
          utility: "Utility", religi: "Religi", info: "Info", cek: "Cek",
          economy: "Economy", user: "User", random: "Random", premium: "Premium",
          ephoto: "Ephoto", jpm: "JPM", pushkontak: "Push Kontak",
          panel: "Panel", owner: "Owner", store: "Store",
        };
        const catRows = Object.keys(allCats)
          .sort((a, b) => {
            const ia = categoryOrder.indexOf(a), ib = categoryOrder.indexOf(b);
            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
          })
          .filter(cat => {
            if (cat === "owner" && !m.isOwner) return false;
            return (allCats[cat] || []).length > 0;
          })
          .map(cat => ({
            title: catNames[cat] || cat.charAt(0).toUpperCase() + cat.slice(1),
            id: `${prefix}menukategori ${cat}`,
          }));
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
                    jpegThumbnail: thumbV3,
                  },
                },
                body: { text },
                footer: { text: "🌸 Silahkan pilih dari salah satu tombol di bawah" },
                contextInfo: { mentionedJid: [m.sender], isForwarded: false },
                nativeFlowMessage: {
                  buttons: [
                    { name: "single_select", buttonParamsJson: JSON.stringify({ title: "Kategori", sections: [{ title: "Pilih Kategori", rows: catRows }] }) },
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Info Lainnya", id: `${prefix}infov2` }) },
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "All Menu", id: `${prefix}allmenu` }) },
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Tanya AI", id: `${prefix}aihelp` }) },
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Rules", id: `${prefix}rules` }) },
                    { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Owner", id: `${prefix}owner` }) },
                  ],
                },
              },
            },
          },
        }, { quoted: getVerifiedQuoted(botConfig), userJid: sock.user.jid });
        await sock.relayMessage(m.chat, msg3.message, { messageId: msg3.key.id });
        break;
      }

      case 4: {
        const media4 = await prepareWAMessageMedia(
          { video: fs.existsSync(config.assets["nova-mp4"]) ? fs.readFileSync(config.assets["nova-mp4"]) : fs.readFileSync(config.assets["nova"]), gifPlayback: true },
          { upload: sock.waUploadToServer },
        );
        const msg4 = generateWAMessageFromContent(m.chat, {
          viewOnceMessage: { message: {
            messageContextInfo: {},
            interactiveMessage: {
              header: { title: "", subtitle: "", hasMediaAttachment: true, videoMessage: media4.videoMessage },
              body: { text },
              footer: { text: `🌸 ${config.bot?.name} | Nova Ai WhatsApp Bot` },
              contextInfo: { isForwarded: false, forwardingScore: 9, participant: "0@s.whatsapp.net", quotedMessage: { conversation: `${config.bot?.name}` }, mentionedJid: [m.sender] },
              nativeFlowMessage: {
                messageParamsJson: JSON.stringify({}),
                buttons: [
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Kategori", id: `${prefix}menukategori` }) },
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "All Menu", id: `${prefix}allmenu` }) },
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Tanya AI", id: `${prefix}aihelp` }) },
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Rules", id: `${prefix}rules` }) },
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Owner", id: `${prefix}owner` }) },
                ],
              },
            },
          } },
        }, { quoted: getVerifiedQuoted(botConfig, m), userJid: sock.user.jid });
        await sock.relayMessage(m.chat, msg4.message, { messageId: msg4.key.id });
        break;
      }

      case 5: {
        const thumbV5 = await getMenuThumbnail("nova");
        const msg5 = generateWAMessageFromContent(m.chat, {
          viewOnceMessage: { message: {
            messageContextInfo: {},
            interactiveMessage: {
              header: { hasMediaAttachment: true, locationMessage: { degreesLatitude: 0, degreesLongitude: 0, name: config.bot?.name || "Nova-AI", address: `v${config.bot?.version || "1.0.0"}`, jpegThumbnail: thumbV5 } },
              body: { text },
              footer: { text: `🌸 ${config.bot?.name} | Nova Ai WhatsApp Bot` },
              contextInfo: { mentionedJid: [m.sender], isForwarded: false, forwardingScore: 9 },
              nativeFlowMessage: {
                messageParamsJson: JSON.stringify({}),
                buttons: [
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Kategori", id: `${prefix}menukategori` }) },
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Info Lainnya", id: `${prefix}infov2` }) },
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "All Menu", id: `${prefix}allmenu` }) },
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Tanya AI", id: `${prefix}aihelp` }) },
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Rules", id: `${prefix}rules` }) },
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Owner", id: `${prefix}owner` }) },
                ],
              },
            },
          } },
        }, { quoted: getVerifiedQuoted(botConfig, m), userJid: sock.user.jid });
        await sock.relayMessage(m.chat, msg5.message, { messageId: msg5.key.id });
        break;
      }

      case 6: {
        const thumbV6 = await getMenuThumbnail("nova");
        async function weatherMenu(city = "Jakarta") {
          try {
            const geo = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`, { timeout: 5000 });
            const loc = geo.data.results?.[0];
            if (!loc) return "Cuaca tidak tersedia";
            const weather = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,weather_code`, { timeout: 5000 });
            const c = weather.data.current;
            const kondisi = { 0: "Cerah", 1: "Cerah Berawan", 2: "Berawan", 3: "Mendung", 45: "Berkabut", 51: "Gerimis", 61: "Hujan Ringan", 63: "Hujan", 95: "Badai Petir" }[c.weather_code] || "Tidak diketahui";
            return `${kondisi} | ${Math.round(c.temperature_2m)}°C\n${loc.name}`;
          } catch { return "Cuaca tidak tersedia"; }
        }
        const msg6 = generateWAMessageFromContent(m.chat, {
          viewOnceMessage: { message: {
            messageContextInfo: {},
            interactiveMessage: {
              header: { hasMediaAttachment: true, locationMessage: { degreesLatitude: 0, degreesLongitude: 0, name: config.bot?.name || "Nova-AI", address: await weatherMenu(), jpegThumbnail: thumbV6 } },
              body: { text },
              contextInfo: { mentionedJid: [m.sender], isForwarded: false, forwardingScore: 9 },
              nativeFlowMessage: {
                buttons: [
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Kategori", id: `${prefix}menukategori` }) },
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "All Menu", id: `${prefix}allmenu` }) },
                  { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Tanya AI", id: `${prefix}aihelp` }) },
                ],
              },
            },
          } },
        }, { quoted: getVerifiedQuoted(botConfig), userJid: sock.user.jid });
        await sock.relayMessage(m.chat, msg6.message, { messageId: msg6.key.id });
        break;
      }

      default:
        await m.reply(claraWrap("menu", text));
    }
  } catch (error) {
    console.error("[Menu] Error:", error.message);
    let fallbackThumb = null;
    try {
      const rawThumb = imageBuffer || thumbBuffer;
      if (rawThumb) {
        fallbackThumb = await _sharp(rawThumb).resize(640, 360, { fit: "cover" }).toBuffer();
      }
    } catch (e) {
      fallbackThumb = thumbBuffer || imageBuffer || null;
    }
    if (fallbackThumb) {
      await sock.sendMessage(m.chat, { text, contextInfo: getContextInfo(botConfig, m, fallbackThumb, true) }, { quoted: m });
    } else {
      await m.reply(claraWrap("menu", text));
    }
  }

  // ── Audio menu (independent try-catch, runs even if menu display failed) ──
  try {
    const audioEnabled = db.setting("audioMenu") !== false;
    if (audioEnabled) {
      const audioPath = botConfig.assets["nova-mp3"];
      const audioVariant = db.setting("menuAudioStyle") || 1;
      if (audioVariant === 1) {
        try {
          const tempDir = path.join(process.cwd(), "temp");
          if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
          const destPath = path.join(tempDir, "menu_audio_opus.ogg");
          if (!fs.existsSync(destPath)) {
            const mp3Path = path.join(tempDir, "menu_audio.mp3");
            fs.copyFileSync(audioPath, mp3Path);
            const { spawn } = await import("child_process");
            await new Promise((resolve, reject) => {
              const ffmpeg = spawn("ffmpeg", ["-y", "-i", mp3Path, "-c:a", "libopus", "-b:a", "128k", "-vbr", "on", "-application", "audio", "-ar", "48000", destPath]);
              ffmpeg.on("close", (code) => { if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path); if (code === 0) resolve(); else reject(new Error("FFmpeg error")); });
              ffmpeg.on("error", (err) => { if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path); reject(err); });
            });
          }
          await sock.sendMessage(m.chat, { audio: { url: destPath }, mimetype: "audio/ogg; codecs=opus", ptt: true }, { quoted: m });
        } catch {
          await sock.sendMessage(m.chat, { audio: { url: audioPath }, mimetype: "audio/mpeg", ptt: false }, { quoted: m });
        }
      } else if (audioVariant === 2) {
        const qpoll = { key: { participant: "0@s.whatsapp.net" }, message: { pollCreationMessage: { name: config.bot.name } } };
        try {
          const tempDir = path.join(process.cwd(), "temp");
          if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
          const destPath = path.join(tempDir, "menu_audio_opus.ogg");
          if (!fs.existsSync(destPath)) {
            const mp3Path = path.join(tempDir, "menu_audio.mp3");
            fs.copyFileSync(audioPath, mp3Path);
            const { spawn } = await import("child_process");
            await new Promise((resolve, reject) => {
              const ffmpeg = spawn("ffmpeg", ["-y", "-i", mp3Path, "-c:a", "libopus", "-b:a", "128k", "-vbr", "on", "-application", "audio", "-ar", "48000", destPath]);
              ffmpeg.on("close", (code) => { if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path); if (code === 0) resolve(); else reject(new Error("FFmpeg error")); });
              ffmpeg.on("error", (err) => { if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path); reject(err); });
            });
          }
          await sock.sendMessage(m.chat, { audio: { url: destPath }, mimetype: "audio/ogg; codecs=opus", ptt: true }, { quoted: qpoll });
        } catch {
          await sock.sendMessage(m.chat, { audio: fs.readFileSync(audioPath), mimetype: "audio/mpeg", ptt: false }, { quoted: qpoll });
        }
      } else {
        await sock.sendMessage(m.chat, { audio: fs.readFileSync(audioPath), mimetype: "audio/mpeg", ptt: false }, { quoted: m });
      }
    }
  } catch (e) { console.error("[Menu] Error sending audio:", e.message); }

  await m.react("✅");
}

export default { config: pluginConfig, handler };
