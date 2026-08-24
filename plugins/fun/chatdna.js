// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// plugins/fun/chatdna.js
// Chat DNA Analyzer - Analyze chat patterns and generate fun "DNA" profiles
// Commands: .chatdna (@tag), .dnamatch @user1 @user2, .chatdnaon, .chatdnaoff

import fs from "fs";
import path from "path";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const DB_FILE = path.join(process.cwd(), "database", "chat_dna.json");

// ─── Database helpers ───
function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    }
  } catch (e) { console.error('[chatdna.js]:', e.message); }
  return { users: {}, settings: { globalEnabled: true, groups: {} } };
}

function saveDB(db) {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) { console.error('[chatdna.js]:', e.message); }
}

// ─── Check if tracking is enabled ───
function isTrackingEnabled(groupId) {
  const db = loadDB();
  if (!db.settings) db.settings = { globalEnabled: true, groups: {} };
  // Global off = everything off
  if (!db.settings.globalEnabled) return false;
  // Per-group check: if group exists in settings.groups, use its value
  if (groupId && db.settings.groups[groupId] !== undefined) {
    return db.settings.groups[groupId];
  }
  // Default: follow global setting
  return db.settings.globalEnabled;
}

// ─── Stopwords (Indonesian + common slang) ───
const STOPWORDS = new Set([
  "yang", "dan", "di", "ke", "dari", "untuk", "pada", "dengan", "atau",
  "tapi", "ini", "itu", "jadi", "ya", "ga", "gak", "tidak", "aku", "kamu",
  "dia", "kita", "kalian", "saya", "ada", "juga", "lagi", "sudah", "belum",
  "akan", "bisa", "harus", "mau", "sama", "kalau", "klo", "kalo", "udah",
  "udh", "yg", "dgn", "krn", "karna", "gue", "gw", "lo", "lu", "nih", "nah",
  "kan", "kok", "donk", "dong", "sih", "deh", "tuh", "pun", "the", "and",
  "is", "to", "in", "it", "of", "for", "you", "me", "my", "we", "they",
]);

// ─── Toxic keywords ───
const TOXIC_WORDS = new Set([
  "anjing", "bangsat", "kontol", "memek", "goblok", "bego", "tolol",
  "idiot", "fuck", "shit", "bitch", "setan", "iblis",
]);

// ─── Emoji detection (simple unicode ranges) ───
function extractEmojis(text) {
  const result = [];
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (
      (code >= 0x1f600 && code <= 0x1f64f) ||
      (code >= 0x1f300 && code <= 0x1f5ff) ||
      (code >= 0x1f680 && code <= 0x1f6ff) ||
      (code >= 0x1f700 && code <= 0x1f77f) ||
      (code >= 0x2600 && code <= 0x26ff) ||
      (code >= 0x2700 && code <= 0x27bf)
    ) {
      result.push(ch);
    }
  }
  return result;
}

// ─── Track DNA from a message (call from main handler) ───
export function trackDNA(msg, sock) {
  try {
    const groupId = msg.key?.remoteJid;
    if (!groupId || !groupId.endsWith("@g.us")) return;

    // Respect toggle - skip if tracking is off
    if (!isTrackingEnabled(groupId)) return;

    const jid = msg.key?.participant || msg.key?.remoteJid;
    if (!jid || jid === "status@broadcast") return;

    if (msg.key?.fromMe) return;

    let text = "";
    const m = msg.message;
    if (m) {
      if (m.conversation) text = m.conversation;
      else if (m.extendedTextMessage?.text) text = m.extendedTextMessage.text;
      else if (m.imageMessage?.caption) text = m.imageMessage.caption;
      else if (m.videoMessage?.caption) text = m.videoMessage.caption;
    }

    const db = loadDB();

    if (!db.users[jid]) {
      db.users[jid] = {
        totalMessages: 0,
        totalWords: 0,
        totalChars: 0,
        hourActivity: new Array(24).fill(0),
        emojiUsage: {},
        topWords: {},
        toxicCount: 0,
        replyCount: 0,
        newThreadCount: 0,
        groups: {},
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        lastMessageTime: 0,
        responseTimes: [],
      };
    }

    const user = db.users[jid];
    user.totalMessages++;
    user.lastSeen = Date.now();

    if (text && text.length > 0) {
      const words = text.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
      user.totalWords += words.length;
      user.totalChars += text.length;

      const hour = new Date().getHours();
      user.hourActivity[hour]++;

      const emojis = extractEmojis(text);
      for (const e of emojis) {
        user.emojiUsage[e] = (user.emojiUsage[e] || 0) + 1;
      }

      for (const w of words) {
        const clean = w.replace(/[^a-z0-9]/g, "");
        if (clean.length > 3 && !STOPWORDS.has(clean)) {
          user.topWords[clean] = (user.topWords[clean] || 0) + 1;
        }
        if (TOXIC_WORDS.has(clean)) {
          user.toxicCount++;
        }
      }

      if (m?.extendedTextMessage?.contextInfo?.quotedMessage) {
        user.replyCount++;
      } else {
        user.newThreadCount++;
      }

      if (user.lastMessageTime > 0) {
        const gap = Date.now() - user.lastMessageTime;
        if (gap > 3000 && gap < 3600000) {
          user.responseTimes.push(gap);
          if (user.responseTimes.length > 50) user.responseTimes.shift();
        }
      }
      user.lastMessageTime = Date.now();
    }

    user.groups[groupId] = (user.groups[groupId] || 0) + 1;

    saveDB(db);
  } catch (e) {
    // Silent fail - never break chat flow
  }
}

// ─── Find peak hour ───
function getPeakHour(user) {
  let peakHour = 0;
  let peakCount = 0;
  for (let i = 0; i < 24; i++) {
    if (user.hourActivity[i] > peakCount) {
      peakCount = user.hourActivity[i];
      peakHour = i;
    }
  }
  return peakHour;
}

// ─── Generate DNA Profile ───
function generateDNA(jid) {
  const db = loadDB();
  const user = db.users[jid];

  if (!user || user.totalMessages < 5) return null;

  const peakHour = getPeakHour(user);

  const ZODIACS = [
    { range: [4, 6], name: "The Dawn Whisperer", desc: "Bangun subuh, chat duluan sebelum dunia bangun. Sebat mindset" },
    { range: [7, 11], name: "The Morning Spirit", desc: "Energi pagi paling produktif. Chat sambil sarapan" },
    { range: [12, 15], name: "The Midday Hustler", desc: "Siang paling aktif. Kerja sambil chat, multi-tasking king" },
    { range: [16, 19], name: "The Sunset Chiller", desc: "Santai sore. Chat pelan tapi konsisten. Vibes-nya aman" },
    { range: [20, 23], name: "The Night Owl", desc: "Hidup baru mulai jam 8 malam. Chat sampai dini hari" },
    { range: [0, 3], name: "The Midnight Phantom", desc: "Muncul jam 12 malam ke atas. Sepi tapi berbahaya" },
  ];
  const zodiac = ZODIACS.find((z) => peakHour >= z.range[0] && peakHour <= z.range[1]) || ZODIACS[4];

  const avgWords = user.totalWords / Math.max(user.totalMessages, 1);
  const replyRatio = user.replyCount / Math.max(user.totalMessages, 1);

  let chatType, typeDesc;
  if (avgWords < 3) {
    chatType = "The Sniper";
    typeDesc = "Satu kata, tepat sasaran. Gak boros kata, langsung ke point";
  } else if (avgWords > 15) {
    chatType = "The Essay Writer";
    typeDesc = "Tiap pesan kayak nulis skripsi. Detail banget, kadang kebanyakan";
  } else if (replyRatio > 0.6) {
    chatType = "The Responder";
    typeDesc = "Jarang mulai obrolan, tapi selalu ada kalau di-reply. Loyal chatter";
  } else if (replyRatio < 0.2) {
    chatType = "The Conversation Starter";
    typeDesc = "Paling sering mulai topik baru. Gak nunggu orang, dia yang bikin rame";
  } else {
    chatType = "The Balanced Diplomat";
    typeDesc = "Mulai obrolan dan reply seimbang. True diplomat grup";
  }

  const activeGroups = Object.keys(user.groups).length;
  let battery, batteryDesc;
  if (user.totalMessages > 5000) {
    battery = "██████████";
    batteryDesc = "100% - Keracunan chat. Harus istirahat. Rumah sakit chat";
  } else if (user.totalMessages > 2000) {
    battery = "████████░░";
    batteryDesc = "80% - Cukup aktif. Masih punya kehidupan nyata... mungkin";
  } else if (user.totalMessages > 500) {
    battery = "█████░░░░░";
    batteryDesc = "50% - Sehat. Balance antara chat dan real life";
  } else if (user.totalMessages > 100) {
    battery = "███░░░░░░░";
    batteryDesc = "30% - Lumayan. Masih malu-malu atau sibuk";
  } else {
    battery = "█░░░░░░░░░";
    batteryDesc = "10% - Ghost mode. Muncul, baca, hilang. Ninja chat";
  }

  const sortedEmojis = Object.entries(user.emojiUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const topEmojis = sortedEmojis.length > 0
    ? sortedEmojis.map((e) => `${e[0]} (${e[1]}x)`).join(" ")
    : "Tidak ada emoji - chat tulus tanpa pernak-pernik";

  const sortedWords = Object.entries(user.topWords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const topWords = sortedWords.length > 0
    ? sortedWords.map((w) => `#${w[0]}`).join(" ")
    : "Belum ada topik dominan";

  const avgResp = user.responseTimes.length > 0
    ? user.responseTimes.reduce((a, b) => a + b, 0) / user.responseTimes.length / 1000
    : 0;
  let respDesc;
  if (avgResp === 0) {
    respDesc = "Belum cukup data. Chat lebih banyak lagi!";
  } else if (avgResp < 10) {
    respDesc = `${Math.round(avgResp)}s - Kilat. Mungkin HP gak pernah lepas dari tangan`;
  } else if (avgResp < 60) {
    respDesc = `${Math.round(avgResp)}s - Cepat. Gak nunggu lama. Efficient chatter`;
  } else if (avgResp < 300) {
    respDesc = `${Math.round(avgResp / 60)}m - Sedang. Mikir dulu sebelum balas. Strategis`;
  } else {
    respDesc = `${Math.round(avgResp / 60)}m - Lambat. Bikin penasaran. Main hard to get?`;
  }

  const toxicity = user.totalMessages > 0
    ? (user.toxicCount / user.totalMessages * 100)
    : 0;
  let toxLevel, toxDesc;
  if (toxicity > 10) {
    toxLevel = "TINGGI";
    toxDesc = "Hati-hati, mulut cukup pedas. Jaga kata ya";
  } else if (toxicity > 3) {
    toxLevel = "WASPADA";
    toxDesc = "Kadang pedas, tapi masih dalam batas wajar";
  } else {
    toxLevel = "BERSIH";
    toxDesc = "Bersih dari kata-kata kasar. Sopan santun!";
  }

  const daysActive = Math.max(1, Math.ceil((Date.now() - user.firstSeen) / 86400000));
  const msgsPerDay = Math.round(user.totalMessages / daysActive);

  const body = [
    `┊ Pengguna: @${jid.split("@")[0]}`,
    `┊ Total Pesan: ${user.totalMessages}`,
    `┊ Pesan/Hari: ${msgsPerDay}`,
    `┊ Grup Aktif: ${activeGroups}`,
    `┊ Hari Tracking: ${daysActive}`,
    `┊`,
    `┊ *Chat Zodiac*`,
    `┊ ${zodiac.name}`,
    `┊ ${zodiac.desc}`,
    `┊ Peak: ${peakHour}:00`,
    `┊`,
    `┊ *Chat Type*`,
    `┊ ${chatType}`,
    `┊ ${typeDesc}`,
    `┊ Words/msg: ${avgWords.toFixed(1)} | Reply: ${Math.round(replyRatio * 100)}%`,
    `┊`,
    `┊ *Social Battery*`,
    `┊ ${battery}`,
    `┊ ${batteryDesc}`,
    `┊`,
    `┊ *Emoji Signature*`,
    `┊ ${topEmojis}`,
    `┊`,
    `┊ *Top Words*`,
    `┊ ${topWords}`,
    `┊`,
    `┊ *Response Style*`,
    `┊ ${respDesc}`,
    `┊`,
    `┊ *Toxicity Level*`,
    `┊ ${toxLevel} (${toxicity.toFixed(1)}%)`,
    `┊ ${toxDesc}`,
  ].join("\n");

  return body;
}

// ─── DNA Match (compare 2 users) ───
function dnaMatch(jid1, jid2) {
  const db = loadDB();
  const u1 = db.users[jid1];
  const u2 = db.users[jid2];

  if (!u1 || !u2) return null;
  if (u1.totalMessages < 5 || u2.totalMessages < 5) return null;

  let score = 0;
  const reasons = [];

  const peak1 = getPeakHour(u1);
  const peak2 = getPeakHour(u2);
  const hourDiff = Math.abs(peak1 - peak2);
  if (hourDiff <= 2) {
    score += 25;
    reasons.push("Jam aktif hampir sama - gak akan saling nungguin");
  } else if (hourDiff <= 5) {
    score += 15;
    reasons.push("Jam aktif lumayan beda tapi masih bisa ketemu");
  } else {
    score += 5;
    reasons.push("Jam aktif beda jauh - kayak beda zona waktu");
  }

  const avg1 = u1.totalWords / Math.max(u1.totalMessages, 1);
  const avg2 = u2.totalWords / Math.max(u2.totalMessages, 1);
  if (Math.abs(avg1 - avg2) < 3) {
    score += 20;
    reasons.push("Gaya ngomong sefrekuensi - kata-per-pesan mirip");
  } else if (Math.abs(avg1 - avg2) < 8) {
    score += 10;
    reasons.push("Gaya ngomong lumayan mirip");
  }

  const e1 = new Set(Object.keys(u1.emojiUsage));
  const e2 = new Set(Object.keys(u2.emojiUsage));
  let emojiOverlap = 0;
  for (const e of e1) if (e2.has(e)) emojiOverlap++;
  if (emojiOverlap >= 5) {
    score += 20;
    reasons.push(`${emojiOverlap} emoji favorit sama - soulmate emoji!`);
  } else if (emojiOverlap >= 2) {
    score += 12;
    reasons.push(`${emojiOverlap} emoji sama - ada chemistry`);
  } else if (emojiOverlap > 0) {
    score += 5;
    reasons.push("Beberapa emoji sama");
  }

  const w1 = new Set(Object.keys(u1.topWords));
  const w2 = new Set(Object.keys(u2.topWords));
  let wordOverlap = 0;
  const sharedWords = [];
  for (const w of w1) {
    if (w2.has(w)) {
      wordOverlap++;
      sharedWords.push(`#${w}`);
    }
  }
  if (wordOverlap >= 5) {
    score += 25;
    reasons.push(`${wordOverlap} topik sama (${sharedWords.slice(0, 4).join(", ")}) - banyak yang bisa dibahas`);
  } else if (wordOverlap >= 2) {
    score += 15;
    reasons.push(`${wordOverlap} topik sama (${sharedWords.join(", ")})`);
  } else if (wordOverlap > 0) {
    score += 5;
    reasons.push("1 topik sama");
  }

  const ratio = Math.min(u1.totalMessages, u2.totalMessages) /
    Math.max(u1.totalMessages, u2.totalMessages);
  if (ratio > 0.7) {
    score += 10;
    reasons.push("Level aktivitas seimbang - gak ada yang ngerasa ghost");
  } else if (ratio > 0.3) {
    score += 5;
    reasons.push("Salah satu lebih aktif dari yang lain");
  }

  score = Math.min(score, 100);

  let verdict;
  if (score >= 80) verdict = "SOULMATE CHAT! Kalian dibuat untuk saling chat";
  else if (score >= 60) verdict = "Cocok banget! Bisa jadi bestie chat";
  else if (score >= 40) verdict = "Lumayan cocok. Masih bisa kenalan lebih dalam";
  else if (score >= 20) verdict = "Agak beda frekuensi. Tapi gak ada yang gak mungkin";
  else verdict = "Beda dunia. Tapi lawan magnet kadang tarik-menarik";

  return { score, reasons, verdict };
}

// ─── Plugin Config ───
const pluginConfig = {
  name: "chatdna",
  alias: ["chatdna", "dnamatch", "chatdnaon", "chatdnaoff", "chatdnastatus"],
  category: "fun",
  description: "Analisa DNA chat kamu atau match 2 user berdasarkan pola chat",
  usage: ".chatdna (@tag)\n.dnamatch @user1 @user2\n.chatdnaon (grup ini)\n.chatdnaoff (grup ini)\n.chatdnastatus",
  example: ".chatdna\n.chatdna @budi\n.dnamatch @budi @siti\n.chatdnaon",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

// ─── Handler ───
async function handler(m, { sock }) {
  try {
    const command = m.body?.split(" ")[0]?.replace(".", "") || "";
    const groupId = m.key?.remoteJid || "";
    const isOwner = m.isOwner || false;

    // ─── Toggle commands (owner only) ───
    if (command === "chatdnaon") {
      if (!isOwner) {
        await m.reply("Perintah ini khusus Owner bot.");
        return;
      }
      await m.react("🐣");
      const db = loadDB();
      if (!db.settings) db.settings = { globalEnabled: true, groups: {} };
      db.settings.groups[groupId] = true;
      db.settings.globalEnabled = true;
      saveDB(db);
      await m.reply(claraWrap("Chat DNA", "Tracking Chat DNA untuk grup ini sudah DINYALAKAN.\n\nBot akan mulai merekam pola chat di grup ini."));
      await m.react("✅");
      return;
    }

    if (command === "chatdnaoff") {
      if (!isOwner) {
        await m.reply("Perintah ini khusus Owner bot.");
        return;
      }
      await m.react("🐣");
      const db = loadDB();
      if (!db.settings) db.settings = { globalEnabled: true, groups: {} };
      db.settings.groups[groupId] = false;
      saveDB(db);
      await m.reply(claraWrap("Chat DNA", "Tracking Chat DNA untuk grup ini sudah DIMATIKAN.\n\nBot berhenti merekam pola chat di grup ini. Data yang sudah terkumpul tetap tersimpan."));
      await m.react("✅");
      return;
    }

    if (command === "chatdnastatus") {
      await m.react("🐣");
      const db = loadDB();
      if (!db.settings) db.settings = { globalEnabled: true, groups: {} };
      const globalStatus = db.settings.globalEnabled ? "ON" : "OFF";
      let groupStatus;
      if (db.settings.groups[groupId] !== undefined) {
        groupStatus = db.settings.groups[groupId] ? "ON" : "OFF";
      } else {
        groupStatus = "Mengikuti Global (" + globalStatus + ")";
      }
      const trackedUsers = Object.keys(db.users).length;
      const totalMessages = Object.values(db.users).reduce((sum, u) => sum + (u.totalMessages || 0), 0);

      const statusBody = [
        `┊ *Status Chat DNA*`,
        `┊`,
        `┊ Global: ${globalStatus}`,
        `┊ Grup Ini: ${groupStatus}`,
        `┊ Tracked Users: ${trackedUsers}`,
        `┊ Total Pesan Terekam: ${totalMessages}`,
        `┊`,
        `┊ Perintah (Owner only):`,
        `┊ .chatdnaon - Nyalakan tracking grup ini`,
        `┊ .chatdnaoff - Matikan tracking grup ini`,
        `┊ .chatdna - Lihat DNA profile kamu`,
        `┊ .dnamatch @user1 @user2 - Match DNA`,
      ].join("\n");
      await m.reply(claraWrap("Chat DNA Status", statusBody));
      await m.react("✅");
      return;
    }

    // ─── Check if tracking is enabled for this group ───
    if (!isTrackingEnabled(groupId)) {
      await m.reply(claraWrap("Chat DNA", "Tracking Chat DNA sedang DIMATIKAN untuk grup ini.\n\nMinta owner untuk menyalakan dengan .chatdnaon"));
      return;
    }

    await m.react("🐣");

    const mentioned =
      m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    // ─── .chatdna command ───
    if (command === "chatdna") {
      let target = m.sender || m.key?.participant || m.key?.remoteJid;
      let targetName = "Kamu";
      if (mentioned.length > 0) {
        target = mentioned[0];
        targetName = `@${target.split("@")[0]}`;
      }

      const profile = generateDNA(target);
      if (!profile) {
        const msg = claraWrap(
          "Chat DNA",
          `Data belum cukup untuk ${targetName}. Minimal 5 pesan di grup untuk mulai tracking DNA. Tetap aktif chat!`
        );
        await m.reply( msg, { commandName: "chatdna" });
        await m.react("✅");
        return;
      }

      const result = claraWrap(`Chat DNA - ${targetName}`, profile);
      await m.reply(result);
      await m.react("✅");
    }

    // ─── .dnamatch command ───
    else if (command === "dnamatch") {
      if (mentioned.length < 2) {
        const help = claraWrap(
          "DNA Match",
          [
            "Cara pakai:",
            "",
            ".dnamatch @user1 @user2",
            "",
            "Tag 2 orang untuk lihat kecocokan DNA chat mereka.",
            "Minimal 5 pesan tiap user untuk hasil akurat.",
          ].join("\n")
        );
        await m.reply( help, { commandName: "dnamatch" });
        await m.react("✅");
        return;
      }

      const result = dnaMatch(mentioned[0], mentioned[1]);
      if (!result) {
        const fail = claraWrap(
          "DNA Match",
          "Salah satu user belum cukup data chat (minimal 5 pesan). Coba lagi nanti setelah mereka lebih aktif."
        );
        await m.reply( fail, { commandName: "dnamatch" });
        await m.react("✅");
        return;
      }

      const reasonsText = result.reasons
        .map((r, i) => `┊ ${i + 1}. ${r}`)
        .join("\n");

      const body = [
        `┊ Match Score: ${result.score}%`,
        `┊`,
        `┊ ${result.verdict}`,
        `┊`,
        `┊ *Alasan Kecocokan:*`,
        reasonsText,
      ].join("\n");

      await m.reply(claraWrap("DNA Match", body));
      await m.react("✅");
    }
  } catch (e) {
    console.error("Chat DNA error:", e.message);
    await m.reply("Error: " + e.message);
  }
}

export { pluginConfig as config, handler };
