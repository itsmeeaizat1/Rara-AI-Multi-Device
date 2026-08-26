// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// menu.js — Menu utama (interactive header image + nativeFlow buttons)
import { getCaseCount, getCasesByCategory } from "../../case/nova.js";
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
import os from "os";
import path from "path";
import { getWeatherFooter } from "../../src/lib/nova-weather-footer.js";
import { sendMenuAudio } from "../../src/lib/send-menu.js";
import { sendMenuCard } from "../../src/lib/nova-menu-card.js";

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

const SC_MAP = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ'};
const toSC = (s) => s.replace(/[a-z]/g, c => SC_MAP[c] || c).replace(/[A-Z]/g, c => (SC_MAP[c.toLowerCase()] || c).toUpperCase());

function getWeton(date = new Date()) {
  const days = ["Pahing", "Pon", "Wage", "Kliwon", "Legi"];
  const ref = new Date(1900, 0, 1);
  const diff = Math.floor((date.getTime() - ref.getTime()) / 86400000);
  return days[((diff % 5) + 5) % 5];
}

function getIslamicDate(date = new Date()) {
  try {
    return new Intl.DateTimeFormat("id-ID-u-ca-islamic", {
      day: "numeric", month: "long", year: "numeric",
    }).format(date);
  } catch { return "-"; }
}

function formatBytes(b) {
  return (b / 1024 / 1024 / 1024).toFixed(2) + " GB";
}

async function buildMenuText(m, botConfig, db, uptime, sock) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const user = db.getUser(m.sender);
    const now = new Date();
    const timeStr = fmtTime("HH:mm");
    const dayName = fmtFull("dddd");
    const dateStr = fmtFull("DD MMMM YYYY");
    const weton = getWeton(now);
    const islamicDate = getIslamicDate(now);
    const importantDay = await getImportantDay(now).catch(() => "-");

    let userRole = "User", roleEmoji = "👤";
    if (m.isOwner) { userRole = "Owner"; roleEmoji = "👑"; }
    else if (m.isPremium) { userRole = "Premium"; roleEmoji = "💎"; }

    const totalUsers = db.getUserCount();
    const allUsers = db.getAllUsers();
    const totalRegistered = Object.values(allUsers).filter(u => u.registeredAt).length;
    const totalPremium = Object.values(allUsers).filter(u => u.isPremium).length;
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem?.() || 0;
    const usedMem = totalMem - (os.freemem?.() || 0);
    const memPercent = totalMem ? ((usedMem / totalMem) * 100).toFixed(1) : "-";
    const cpuModel = os.cpus?.()?.[0]?.model || "Unknown";
    const cpuCores = os.cpus?.()?.length || "-";
    const cpuSpeed = os.cpus?.()?.[0]?.speed || "-";
    const hostname = os.hostname?.() || "unknown";
    const serverUptime = formatUptime(os.uptime?.() || 0);
    const loadAvg = (os.loadavg?.()?.[0] || 0).toFixed(2);
    const userExp = user?.exp || 0;
    const userLevel = Math.floor(userExp / 20000) + 1;
    const expMin = (userLevel - 1) * 20000;
    const expMax = userLevel * 20000;
    const expCurr = userExp - expMin;
    const runtimeStr = formatUptime(uptime);
    const platform = process.platform;

    let weatherBlock = "";
    try {
      const wf = await getWeatherFooter();
      if (wf) weatherBlock = `\n  ┊  ${wf}\n`;
    } catch {}

    const pluginCats = getCategories();
    const commandsByCategory = getCommandsByCategory();
    const caseCats = getCasesByCategory();
    let totalFitur = 0;
    for (const cat of pluginCats) totalFitur += (commandsByCategory[cat] || []).length;
    for (const cat of Object.keys(caseCats)) totalFitur += (caseCats[cat] || []).length;

    const more = String.fromCharCode(8206);
    const readMore = more.repeat(4001);

    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";
    const botNumber = sock?.user?.jid ? sock.user.jid.split("@")[0] : "Unknown";

    return `╭─「 ${toSC(botName)} 」
│ ${getTimeGreeting()} *${m.pushName || "User"}* 👋
│
│  ◈ *ᴜsᴇʀ*
│  ┊ ɴᴀᴍᴀ: ${m.pushName || "User"}
│  ┊ ɴᴏᴍᴏʀ: @${m.sender.split("@")[0]}
│  ┊ ʀᴏʟᴇ: ${roleEmoji} ${userRole}
│  ┊ ᴘʀᴇᴍɪᴜᴍ: ${m.isPremium ? "Aktif" : "Free"}
│  ┊ ᴇɴᴇʀɢɪ: ${m.isOwner || m.isPremium ? "∞" : (user?.energi ?? 25)}
│  ┊ ᴋᴏɪɴ: ${(user?.koin ?? 0).toLocaleString()}
│  ┊ ʟɪᴍɪᴛ: ${m.isOwner || m.isPremium ? "∞" : (user?.limit ?? "-")}
│  ┊ ʟᴇᴠᴇʟ: ${userLevel}
│  ┊ xᴘ: ${expCurr.toLocaleString()} / ${(expMax - expMin).toLocaleString()}
│  ┊ sᴛᴀᴛᴜs: ${user?.banned ? "Banned" : "Aktif"}
│
│  ◈ *ʙᴏᴛ*
│  ┊ ɴᴀᴍᴀ: ${botName}
│  ┊ ɴᴏᴍᴏʀ: ${botNumber}
│  ┊ ᴠᴇʀsɪᴏɴ: ${botConfig.bot?.version || "-"}
│  ┊ ᴍᴏᴅᴇ: ${(botConfig.mode || "public").toUpperCase()}
│  ┊ ᴘʀᴇꜰɪx: [ ${prefix} ]
│  ┊ ᴜᴘᴛɪᴍᴇ: ${runtimeStr}
│  ┊ ᴜsᴇʀs: ${totalUsers} (${totalRegistered} reg)
│  ┊ ᴘʀᴇᴍɪᴜᴍ: ${totalPremium}
│
│  ◈ *sᴇʀᴠᴇʀ*
│  ┊ ᴏs: ${platform}
│  ┊ ʜᴏsᴛ: ${hostname}
│  ┊ ɴᴏᴅᴇ: ${process.version}
│  ┊ ᴄᴘᴜ: ${cpuModel}
│  ┊ ᴄᴏʀᴇs: ${cpuCores} @ ${cpuSpeed} MHz
│  ┊ ʟᴏᴀᴅ: ${loadAvg}
│  ┊ ʀᴀᴍ: ${totalMem ? formatBytes(usedMem) + "/" + formatBytes(totalMem) + " (" + memPercent + "%)" : "-"}
│  ┊ ʙᴏᴛ ʀᴀᴍ: ${formatBytes(memUsage.rss)}
│  ┊ ᴜᴘᴛɪᴍᴇ: ${serverUptime}
│
│  ◈ *ᴡᴀᴋᴛᴜ*
│  ┊ ${timeStr} WIB — ${dayName} ${weton}
│  ┊ ${dateStr}
│  ┊ ${islamicDate} (Hijriah)
│  ┊ Hari Penting: ${importantDay}${weatherBlock}
╰──────────────
❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀
${readMore}

┌──「 *Quick Menu* 」
│  ◈ .menu
│  ◈ .allmenu
│  ◈ .allmenucategory <kategori>
│  ◈ .tanyaai
└──「 *Info* 」
│  ◈ .info
│  ◈ .owner
│  ◈ .rules
│  ◈ .donasi
└──「 *Store* 」
│  ◈ .sewa
│  ◈ .payment
│  ◈ .listban
└

*Total: ${totalFitur} Fitur*
Ketik *${prefix}allmenu* untuk semua fitur`;
  } catch (e) {
    console.error("[menu] buildMenuText error:", e.message);
    return `╭─「 Menu 」\n│ Error: ${e.message}\n╰─`;
  }
}

async function handler(m, { sock, config: botConfig, db, uptime }) {
  try {
    await m.react("🕒");
    const prefix = botConfig.command?.prefix || ".";
    const text = await buildMenuText(m, botConfig, db, uptime, sock);
    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";

    const navButtons = [
      { id: `${prefix}allmenu`, text: "📋 All Menu" },
      { id: `${prefix}allmenucategory`, text: "📂 Kategori" },
      { id: `${prefix}owner`, text: "👑 Owner" },
    ];

    await sendMenuCard(sock, m, {
      text,
      footer: "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀",
      useImage: false, // tanpa gambar = gak save ke galeri
      buttons: navButtons,
      title: toSC(botName),
    });

    await m.react("🐣");
    try { await sendMenuAudio(sock, m, db, false); } catch {}
  } catch (e) {
    console.error("[menu] handler error:", e.message);
    try { await m.reply("❌ Gagal menampilkan menu: " + e.message); } catch {}
    await m.react("❌");
  }
}

export { pluginConfig as config, handler };
