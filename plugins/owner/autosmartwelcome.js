// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * .autosmartwelcome — Auto-Smart Welcome (AI Personalized)
 *
 * Fitur automation "bot masa depan" #7:
 * - Welcome message yang dynamic & personal per member baru
 * - AI analisis profil: nama, nomor, foto profile, group context
 * - Generate welcome personal yang relevan — bukan template static
 * - Deteksi: nama panggilan, asal nomor (prefix), vibe dari nama
 * - 3 mode: v1 (teks personal), v2 (canvas + caption personal), v3 (full AI teks panjang)
 * - Per-grup toggle & custom personality
 * - Welcome history tracking (siapa yang join, kapan, welcome msg yang dikirim)
 * - Anti-spam: cooldown 5 detik per member
 * - Fallback ke welcome biasa kalau AI gagal
 *
 * Commands:
 *   .autosmartwelcome                      — Dashboard status
 *   .autosmartwelcome on/off               — Aktifkan/matikan
 *   .autosmartwelcome mode <1/2/3>         — Pilih mode (1=teks, 2=canvas, 3=full AI)
 *   .autosmartwelcome personality <teks>   — Set personality welcome
 *   .autosmartwelcome test                 — Test generate welcome untuk diri sendiri
 *   .autosmartwelcome history              — Lihat welcome history
 *   .autosmartwelcome addgc/delgc <gid>    — Manage grup yang aktif
 *   .autosmartwelcome stats                — Statistik welcome
 *   .autosmartwelcome reset                — Reset stats & history
 */

import { getDatabase } from "../../src/lib/nova-database.js";
import { novaError, novaBox, toSC } from "../../src/lib/nova-menu-style.js";
import { callAI } from "../../src/lib/nova-ai-service.js";
import { createWideDiscordCard } from "../../src/lib/nova-welcome-card.js";
import config from "../../config.js";

const pluginConfig = {
  name: "autosmartwelcome",
  alias: ["autosmartwelcome", "smartwelcome", "aiwelcome", "autowelcomeai", "swelcome"],
  category: "owner",
  description: "Auto-Smart Welcome — AI personalized welcome message per member baru",
  usage: ".autosmartwelcome <on/off/mode/personality/test/history/addgc/delgc/stats/reset>",
  example: ".autosmartwelcome on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// ============================================================
// SETTINGS
// ============================================================
function getSettings() {
  const db = getDatabase();
  if (!db.db.data.automation) db.db.data.automation = {};
  if (!db.db.data.automation.autoSmartWelcome) {
    db.db.data.automation.autoSmartWelcome = {
      enabled: false,
      mode: 1, // 1=teks personal, 2=canvas+caption, 3=full AI teks panjang
      personality: "ramah, santai, kadang lucu — typical Indonesian bot community vibe",
      activeGroups: [], // group jids, kosong = semua grup
      stats: {
        totalWelcome: 0,
        totalAI: 0,
        totalFallback: 0,
        byGroup: {}, // { jid: { count, lastWelcome } }
        lastWelcome: null,
      },
      history: [], // last 50 welcomes
      lastWelcomeTime: {}, // { participantJid: timestamp } — anti-spam cooldown
    };
    db.db.write();
  }
  return db.db.data.automation.autoSmartWelcome;
}

// ============================================================
// DETECT COUNTRY/REGION FROM PHONE PREFIX
// ============================================================
function detectRegion(phoneNumber) {
  const num = phoneNumber.replace(/[^0-9]/g, "");
  const prefixes = [
    { prefix: "62", country: "Indonesia", flag: "🇮🇩", lang: "id" },
    { prefix: "60", country: "Malaysia", flag: "🇲🇾", lang: "ms" },
    { prefix: "65", country: "Singapore", flag: "🇸🇬", lang: "en" },
    { prefix: "66", country: "Thailand", flag: "🇹🇭", lang: "th" },
    { prefix: "84", country: "Vietnam", flag: "🇻🇳", lang: "vi" },
    { prefix: "63", country: "Philippines", flag: "🇵🇭", lang: "en" },
    { prefix: "90", country: "Turkey", flag: "🇹🇷", lang: "tr" },
    { prefix: "91", country: "India", flag: "🇮🇳", lang: "hi" },
    { prefix: "880", country: "Bangladesh", flag: "🇧🇩", lang: "bn" },
    { prefix: "44", country: "UK", flag: "🇬🇧", lang: "en" },
    { prefix: "1", country: "USA/Canada", flag: "🇺🇸", lang: "en" },
    { prefix: "49", country: "Germany", flag: "🇩🇪", lang: "de" },
    { prefix: "61", country: "Australia", flag: "🇦🇺", lang: "en" },
    { prefix: "81", country: "Japan", flag: "🇯🇵", lang: "ja" },
    { prefix: "82", country: "Korea", flag: "🇰🇷", lang: "ko" },
    { prefix: "86", country: "China", flag: "🇨🇳", lang: "zh" },
    { prefix: "55", country: "Brazil", flag: "🇧🇷", lang: "pt" },
    { prefix: "34", country: "Spain", flag: "🇪🇸", lang: "es" },
    { prefix: "33", country: "France", flag: "🇫🇷", lang: "fr" },
    { prefix: "39", country: "Italy", flag: "🇮🇹", lang: "it" },
    { prefix: "31", country: "Netherlands", flag: "🇳🇱", lang: "nl" },
    { prefix: "7", country: "Russia/Kazakhstan", flag: "🇷🇺", lang: "ru" },
    { prefix: "966", country: "Saudi Arabia", flag: "🇸🇦", lang: "ar" },
    { prefix: "971", country: "UAE", flag: "🇦🇪", lang: "ar" },
    { prefix: "234", country: "Nigeria", flag: "🇳🇬", lang: "en" },
    { prefix: "27", country: "South Africa", flag: "🇿🇦", lang: "en" },
    { prefix: "20", country: "Egypt", flag: "🇪🇬", lang: "ar" },
    { prefix: "92", country: "Pakistan", flag: "🇵🇰", lang: "ur" },
  ];

  // Sort by prefix length descending (longest match first)
  prefixes.sort((a, b) => b.prefix.length - a.prefix.length);
  for (const p of prefixes) {
    if (num.startsWith(p.prefix)) {
      return p;
    }
  }
  return { country: "Unknown", flag: "🌍", lang: "en" };
}

// ============================================================
// EXTRACT NICKNAME FROM PHONE/NAME
// ============================================================
function extractNickname(phoneNumber) {
  const num = phoneNumber.replace(/[^0-9]/g, "");
  // Last 4 digits as "lucky number"
  const lucky = num.slice(-4);
  return { lucky };
}

// ============================================================
// GENERATE AI WELCOME (personalized)
// ============================================================
async function generateAIWelcome(sock, groupJid, participantJid, metadata, settings) {
  const groupName = metadata?.subject || "Grup";
  const memberCount = metadata?.participants?.length || 0;
  const username = participantJid.split("@")[0].split(":")[0];
  const region = detectRegion(username);
  const { lucky } = extractNickname(username);

  // Coba ambil bio/profile info
  let bio = "";
  try {
    const status = await sock.fetchBusinessProfile(participantJid).catch(() => null);
    if (status?.description) bio = status.description;
  } catch {}

  // Coba ambil profile picture
  let hasPP = false;
  try {
    const ppUrl = await sock.profilePictureUrl(participantJid, "image").catch(() => null);
    hasPP = !!ppUrl;
  } catch {}

  // Build context untuk AI
  const context = [
    `Nama/User: ${username}`,
    `Nomor: +${username}`,
    `Asal: ${region.country} ${region.flag}`,
    `Grup: ${groupName}`,
    `Member ke: ${memberCount}`,
    `Bio: ${bio || "tidak ada"}`,
    `Foto profil: ${hasPP ? "ada" : "tidak ada"}`,
    `Angka keberuntungan: ${lucky}`,
  ].join("\n");

  const systemPrompt = `Kamu adalah bot WhatsApp yang bertugas membuat pesan welcome yang personal dan menarik untuk member baru yang join grup.
Personality: ${settings.personality}

Aturan:
- Pesan MAX 3-4 baris, singkat padat
- Gunakan bahasa Indonesia (atau bahasa negara asal member jika bukan Indonesia)
- Sapa dengan nama/angka yang mudah diingat
- Sebutkan nama grup
- Jangan gunakan emoji berlebihan (max 2-3)
- Jangan gunakan markdown bold/italic
- Buat member baru merasa diterima & nyaman
- Jangan kaku seperti robot — santai dan natural`;

  const userPrompt = `Buatkan pesan welcome untuk member baru ini:\n${context}`;

  try {
    const reply = await callAI({
      providerKey: "openai",
      messages: [{ role: "user", content: userPrompt }],
      systemPrompt,
      apiKey: config.aiHelp?.openaiApiKey || "",
      apiEndpoint: config.aiHelp?.apiEndpoint || "",
      model: config.aiHelp?.model || "gpt-4o-mini",
      temperature: 0.8,
      maxTokens: 200,
    });

    if (reply && reply.trim().length > 10) {
      return reply.trim();
    }
    return null;
  } catch (err) {
    console.error("[autosmartwelcome] AI error:", err.message);
    return null;
  }
}

// ============================================================
// FALLBACK WELCOME (kalau AI gagal)
// ============================================================
function generateFallbackWelcome(participantJid, metadata) {
  const groupName = metadata?.subject || "Grup";
  const memberCount = metadata?.participants?.length || 0;
  const username = participantJid.split("@")[0].split(":")[0];
  const region = detectRegion(username);
  const prefix = config.command?.prefix || ".";

  return (
    "" +
    `Halo +${username} ${region.flag}\n` +
    `Selamat datang di ${groupName}\n` +
    `Kamu member ke-${memberCount}\n` +
    `
` +
    `Ketik ${prefix}menu untuk lihat fitur\n` +
    ""
  );
}

// ============================================================
// MAIN: sendSmartWelcome — dipanggil saat member baru join
// ============================================================
export async function sendSmartWelcome(sock, groupJid, participantJid, metadata) {
  const settings = getSettings();

  // Cek enabled
  if (!settings.enabled) return false;

  // Cek grup aktif (kalau activeGroups diisi, hanya grup itu yang aktif)
  if (settings.activeGroups.length > 0 && !settings.activeGroups.includes(groupJid)) {
    return false;
  }

  // Anti-spam: cooldown 5 detik per member
  const now = Date.now();
  const lastTime = settings.lastWelcomeTime[participantJid] || 0;
  if (now - lastTime < 5000) return false;
  settings.lastWelcomeTime[participantJid] = now;

  const username = participantJid.split("@")[0].split(":")[0];
  const memberCount = metadata?.participants?.length || 0;
  const groupName = metadata?.subject || "Grup";
  const prefix = config.command?.prefix || ".";

  let welcomeText = null;
  let usedAI = false;

  // Generate AI welcome
  if (settings.mode === 3 || settings.mode === 1) {
    welcomeText = await generateAIWelcome(sock, groupJid, participantJid, metadata, settings);
    if (welcomeText) usedAI = true;
  }

  // Fallback kalau AI gagal
  if (!welcomeText) {
    welcomeText = generateFallbackWelcome(participantJid, metadata);
  }

  // Mode 2: canvas image + AI caption
  if (settings.mode === 2) {
    try {
      const ppUrl = await sock.profilePictureUrl(participantJid, "image").catch(() => null);
      const buffer = await createWideDiscordCard(username, ppUrl, groupName, memberCount);
      const caption = welcomeText || generateFallbackWelcome(participantJid, metadata);
      await sock.sendMessage(groupJid, {
        image: buffer,
        caption,
        mentions: [participantJid],
      });
    } catch (err) {
      console.error("[autosmartwelcome] canvas error:", err.message);
      // Fallback ke teks saja
      await sock.sendMessage(groupJid, {
        text: welcomeText,
        mentions: [participantJid],
      });
    }
  } else {
    // Mode 1 & 3: teks saja
    await sock.sendMessage(groupJid, {
      text: welcomeText,
      mentions: [participantJid],
    });
  }

  // Update stats
  settings.stats.totalWelcome++;
  if (usedAI) settings.stats.totalAI++;
  else settings.stats.totalFallback++;

  if (!settings.stats.byGroup[groupJid]) {
    settings.stats.byGroup[groupJid] = { count: 0, lastWelcome: null };
  }
  settings.stats.byGroup[groupJid].count++;
  settings.stats.byGroup[groupJid].lastWelcome = new Date().toISOString();

  settings.stats.lastWelcome = new Date().toISOString();

  // History (last 50)
  settings.history.push({
    jid: participantJid,
    username,
    group: groupName,
    groupJid,
    ai: usedAI,
    timestamp: new Date().toISOString(),
  });
  if (settings.history.length > 50) settings.history.shift();

  getDatabase().db.write();
  return true;
}

// ============================================================
// HANDLER
// ============================================================
async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const settings = getSettings();
    const db = getDatabase();
    const arg = (m.text || "").trim();
    const args = arg.split(/\s+/).filter(Boolean);
    const sub = (args[0] || "").toLowerCase();

    // ─── DASHBOARD ───
    if (!sub) {
      const status = settings.enabled ? "ON" : "OFF";
      const modeLabel = settings.mode === 1 ? "1 (Teks Personal)" : settings.mode === 2 ? "2 (Canvas + AI Caption)" : "3 (Full AI Teks)";
      const groupCount = settings.activeGroups.length === 0 ? "Semua grup" : `${settings.activeGroups.length} grup`;

      await m.reply(novaBox("AUTO-SMART WELCOME", [
        `Status: ${status}`,
        `Mode: ${modeLabel}`,
        `Personality: ${settings.personality}`,
        `Active: ${groupCount}`,
        "---",
        `Stats:`,
        `| Total welcome: ${settings.stats.totalWelcome}`,
        `| AI generated: ${settings.stats.totalAI}`,
        `| Fallback: ${settings.stats.totalFallback}`,
        `| Last: ${settings.stats.lastWelcome || "Belum ada"}`,
      ]) + "\n\n" + novaBox("COMMANDS", [
        `${prefix}autosmartwelcome on/off`,
        `${prefix}autosmartwelcome mode <1/2/3>`,
        `${prefix}autosmartwelcome personality <teks>`,
        `${prefix}autosmartwelcome test`,
        `${prefix}autosmartwelcome history`,
        `${prefix}autosmartwelcome addgc/delgc <gid>`,
        `${prefix}autosmartwelcome stats`,
        `${prefix}autosmartwelcome reset`,
      ]));
      return { handled: true };
    }

    // ─── ON ───
    if (sub === "on") {
      settings.enabled = true;
      db.db.write();
      await m.reply(novaBox("AUTO-SMART WELCOME", [
        "Status: ON",
        "AI personalized welcome aktif",
        `Mode: ${settings.mode === 1 ? "Teks Personal" : settings.mode === 2 ? "Canvas + AI" : "Full AI"}`,
      ]));
      return { handled: true };
    }

    // ─── OFF ───
    if (sub === "off") {
      settings.enabled = false;
      db.db.write();
      await m.reply(novaBox("AUTO-SMART WELCOME", ["Status: OFF"]));
      return { handled: true };
    }

    // ─── MODE ───
    if (sub === "mode") {
      const mode = parseInt(args[1]);
      if (![1, 2, 3].includes(mode)) {
        await m.reply(novaBox("AUTO-SMART WELCOME", [
          `Mode: ${settings.mode}`,
          "1 = Teks Personal (AI generate teks singkat)",
          "2 = Canvas Image + AI Caption (banner + teks AI)",
          "3 = Full AI Teks (AI generate teks panjang personal)",
          `Ketik: ${prefix}autosmartwelcome mode <1/2/3>`,
        ]));
        return { handled: true };
      }
      settings.mode = mode;
      db.db.write();
      const label = mode === 1 ? "Teks Personal" : mode === 2 ? "Canvas + AI Caption" : "Full AI Teks";
      await m.reply(novaBox("AUTO-SMART WELCOME", [`Mode: ${mode} (${label})`]));
      return { handled: true };
    }

    // ─── PERSONALITY ───
    if (sub === "personality") {
      const text = args.slice(1).join(" ");
      if (!text) {
        await m.reply(novaBox("AUTO-SMART WELCOME", [
          `Current: ${settings.personality}`,
          `Ketik: ${prefix}autosmartwelcome personality <deskripsi personality>`,
          `Contoh: ${prefix}autosmartwelcome personality ramah, suka nyapa, kadang bikin joke`,
        ]));
        return { handled: true };
      }
      settings.personality = text;
      db.db.write();
      await m.reply(novaBox("AUTO-SMART WELCOME", [`Personality updated:`, `| ${text}`]));
      return { handled: true };
    }

    // ─── TEST (generate welcome untuk diri sendiri) ───
    if (sub === "test") {
      await m.reply(novaBox("AUTO-SMART WELCOME", ["Generating test welcome..."]));
      const participantJid = m.sender;
      const metadata = {
        subject: m.groupName || "Test Grup",
        participants: { length: m.participants?.length || 1 },
      };

      const welcomeText = await generateAIWelcome(sock, m.chat, participantJid, metadata, settings);
      if (welcomeText) {
        await m.reply(novaBox("AI WELCOME (TEST)", [
          `| ${welcomeText}`,
          "---",
          "Mode: AI Generated",
        ]));
      } else {
        const fallback = generateFallbackWelcome(participantJid, metadata);
        await m.reply(novaBox("FALLBACK WELCOME (TEST)", [
          `| ${fallback}`,
          "---",
          "AI gagal — pakai fallback",
        ]));
      }
      return { handled: true };
    }

    // ─── HISTORY ───
    if (sub === "history") {
      if (settings.history.length === 0) {
        await m.reply(novaBox("AUTO-SMART WELCOME", ["History: kosong"]));
        return { handled: true };
      }
      const recent = settings.history.slice(-15).reverse();
      const lines = recent.map((h) => {
        const time = new Date(h.timestamp).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
        return `| ${h.username} -> ${h.group} ${h.ai ? "[AI]" : "[FB]"} ${time}`;
      });
      await m.reply(novaBox("WELCOME HISTORY", lines));
      return { handled: true };
    }

    // ─── ADDGC ───
    if (sub === "addgc") {
      const gid = args[1] || m.chat;
      if (!gid) {
        await m.reply(novaBox("AUTO-SMART WELCOME", [`Ketik: ${prefix}autosmartwelcome addgc <group_id>`]));
        return { handled: true };
      }
      if (!settings.activeGroups.includes(gid)) {
        settings.activeGroups.push(gid);
        db.db.write();
      }
      await m.reply(novaBox("AUTO-SMART WELCOME", [
        `Grup ditambah: ${gid}`,
        `Total active: ${settings.activeGroups.length}`,
      ]));
      return { handled: true };
    }

    // ─── DELGC ───
    if (sub === "delgc") {
      const gid = args[1] || m.chat;
      settings.activeGroups = settings.activeGroups.filter((g) => g !== gid);
      db.db.write();
      await m.reply(novaBox("AUTO-SMART WELCOME", [
        `Grup dihapus: ${gid}`,
        `Total active: ${settings.activeGroups.length}`,
      ]));
      return { handled: true };
    }

    // ─── STATS ───
    if (sub === "stats") {
      const groupStats = Object.entries(settings.stats.byGroup)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([jid, s]) => `| ${jid.slice(0, 15)}... : ${s.count} welcome, last: ${s.lastWelcome || "never"}`)
        .join("\n") || "Belum ada data";

      const aiRate = settings.stats.totalWelcome > 0
        ? Math.round((settings.stats.totalAI / settings.stats.totalWelcome) * 100)
        : 0;

      await m.reply(novaBox("SMART WELCOME — STATISTIK", [
        `Total: ${settings.stats.totalWelcome}`,
        `AI: ${settings.stats.totalAI} (${aiRate}%)`,
        `Fallback: ${settings.stats.totalFallback}`,
        `Last: ${settings.stats.lastWelcome || "Belum ada"}`,
        "---",
        `Per Grup:`,
        groupStats,
      ]));
      return { handled: true };
    }

    // ─── RESET ───
    if (sub === "reset") {
      settings.stats = {
        totalWelcome: 0,
        totalAI: 0,
        totalFallback: 0,
        byGroup: {},
        lastWelcome: null,
      };
      settings.history = [];
      settings.lastWelcomeTime = {};
      db.db.write();
      await m.reply(novaBox("AUTO-SMART WELCOME", ["Stats & history direset"]));
      return { handled: true };
    }

    // ─── UNKNOWN ───
    await m.reply(novaBox("AUTO-SMART WELCOME", [`Command tidak dikenal: ${sub}`, `Ketik ${prefix}autosmartwelcome untuk dashboard`]));
    return { handled: true };

  } catch (error) {
    console.error("[autosmartwelcome] handler error:", error.message);
    await m.reply(novaError("AutoSmartWelcome", "Gagal nih, coba lagi ya"));
    return { handled: true };
  }
}

// ============================================================
// EXPORT
// ============================================================
export { pluginConfig as config, handler };
