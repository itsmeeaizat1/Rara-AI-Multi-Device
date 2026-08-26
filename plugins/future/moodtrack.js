// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";

const pluginConfig = {
  name: "moodtrack",
  alias: ["moodtrack"],
  category: "future",
  description: "Mood tracker - catat mood harian & lihat pola dengan AI insight",
  usage: ".moodtrack <command>",
  example: ".moodtrack 7",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const MOOD_EMOJIS = [
  { score: 1, emoji: "😢", label: "Sangat sedih" },
  { score: 2, emoji: "😕", label: "Sedih" },
  { score: 3, emoji: "😐", label: "Netral bawah" },
  { score: 4, emoji: "🙂", label: "Biasa aja" },
  { score: 5, emoji: "😊", label: "Lumayan" },
  { score: 6, emoji: "😄", label: "Senang" },
  { score: 7, emoji: "😁", label: "Bahagia" },
  { score: 8, emoji: "🤩", label: "Sangat bahagia" },
  { score: 9, emoji: "🥳", label: "Euforia" },
  { score: 10, emoji: "🚀", label: "Peak happiness" },
];

function todayDate() {
  return new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
}

function getConfig(db, gid) {
  const all = db.setting("moodtrack") || {};
  return all[gid] || {};
}

function saveConfig(db, gid, data) {
  const all = db.setting("moodtrack") || {};
  all[gid] = data;
  db.setting("moodtrack", all);
  db.save();
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const cfg = getConfig(db, gid);

  if (!cfg[m.sender]) {
    cfg[m.sender] = { entries: [], totalLogged: 0 };
  }
  const udata = cfg[m.sender];
  const today = todayDate();

  if (sub === "log" || sub === "catat") {
    const score = parseInt(args[2] || "0", 10);
    const note = args.slice(3).join(" ").trim();
    if (score < 1 || score > 10 || isNaN(score)) {
      const scale = MOOD_EMOJIS.map(e => e.score + "=" + e.emoji + " " + e.label).join("\n");
      await m.reply(claraWrap("Mood Track", "Catat mood: " + prefix + "moodtrack log <1-10> [catatan]\n\n" + scale));
      return { handled: true };
    }
    // Check if already logged today
    const todayEntry = udata.entries.find(e => e.date === today);
    if (todayEntry) {
      todayEntry.score = score;
      todayEntry.note = note || todayEntry.note;
      todayEntry.updatedAt = Date.now();
    } else {
      udata.entries.push({ date: today, score, note, loggedAt: Date.now() });
      udata.totalLogged++;
    }
    saveConfig(db, gid, cfg);
    const mood = MOOD_EMOJIS.find(e => e.score === score);
    await m.reply(claraWrap("Mood Logged", [
      "@" + m.sender.split("@")[0],
      "Mood: " + mood.emoji + " " + score + "/10 (" + mood.label + ")",
      note ? "Catatan: " + note : "",
      "",
      "Total logged: " + udata.totalLogged + " hari",
      "",
      prefix + "moodtrack history - lihat riwayat",
      prefix + "moodtrack insight - AI analisis pola",
    ].join("\n")), { mentions: [m.sender] });
    return { handled: true };
  }

  if (sub === "history" || sub === "riwayat") {
    const recent = udata.entries.slice(-7).reverse();
    if (recent.length === 0) {
      await m.reply(claraWrap("Mood Track", "Belum ada data. Ketik " + prefix + "moodtrack log <1-10>"));
      return { handled: true };
    }
    const list = recent.map(e => {
      const mood = MOOD_EMOJIS.find(m => m.score === e.score);
      return e.date + " | " + mood.emoji + " " + e.score + "/10" + (e.note ? " - " + e.note.slice(0, 40) : "");
    }).join("\n");
    await m.reply(claraWrap("Mood History", "7 hari terakhir:\n" + list));
    return { handled: true };
  }

  if (sub === "insight" || sub === "analisis") {
    if (udata.entries.length < 3) {
      await m.reply(claraWrap("Mood Track", "Butuh minimal 3 hari data untuk analisis. Kamu baru: " + udata.entries.length + " hari."));
      return { handled: true };
    }
    await m.react("🕒");

    // Calculate stats
    const avg = (udata.entries.reduce((s, e) => s + e.score, 0) / udata.entries.length).toFixed(1);
    const highest = udata.entries.reduce((max, e) => e.score > max.score ? e : max);
    const lowest = udata.entries.reduce((min, e) => e.score < min.score ? e : min);
    const recent7 = udata.entries.slice(-7);
    const trend = recent7.length >= 2 ? (recent7[recent7.length - 1].score - recent7[0].score) : 0;
    const trendText = trend > 0 ? "Naik ↗" : trend < 0 ? "Turun ↘" : "Stabil →";

    // AI insight
    const moodData = udata.entries.slice(-14).map(e => e.date + ": " + e.score + "/10" + (e.note ? " (" + e.note + ")" : "")).join("\n");
    let aiInsight = null;
    try {
      const prompt = "Analisis pola mood dari data berikut (bahasa Indonesia, 3-4 kalimat):\n" + moodData + "\n\nRata-rata: " + avg + "/10\nTrend: " + trendText + "\n\nBeri insight tentang: pola mood, saran self-care, dan hal yang mungkin mempengaruhi mood. Singkat dan empatik.";
      const result = await UnlimitedAI(prompt, "nova-ai");
      aiInsight = result?.success ? result.response : null;
    } catch (e) { console.error('[moodtrack.js]:', e.message); }

    await m.react("🐣");
    await m.reply(claraWrap("Mood Insight", [
      "@" + m.sender.split("@")[0],
      "",
      "Statistik (" + udata.entries.length + " hari):",
      "Rata-rata: " + avg + "/10",
      "Tertinggi: " + highest.score + "/10 (" + highest.date + ")",
      "Terendah: " + lowest.score + "/10 (" + lowest.date + ")",
      "Trend 7 hari: " + trendText,
      "",
      "AI Insight:",
      aiInsight || "Data belum cukup untuk insight mendalam. Log mood minimal 7 hari untuk analisis lebih akurat.",
    ].join("\n")), { mentions: [m.sender] });
    return { handled: true };
  }

  if (sub === "stats" || sub === "statistik" || sub === "cek" || !sub) {
    if (udata.entries.length === 0) {
      const scale = MOOD_EMOJIS.map(e => e.score + "=" + e.emoji).join("  ");
      await m.reply(claraWrap("Mood Track", [
        "MOOD TRACKER",
        "",
        "Catat mood kamu tiap hari & track pola!",
        "",
        prefix + "moodtrack log <1-10> [catatan] - catat mood",
        prefix + "moodtrack history - 7 hari terakhir",
        prefix + "moodtrack insight - AI analisis pola",
        prefix + "moodtrack stats - statistik",
        "",
        "Skala: " + scale,
      ].join("\n")));
      return { handled: true };
    }
    const avg = (udata.entries.reduce((s, e) => s + e.score, 0) / udata.entries.length).toFixed(1);
    const todayEntry = udata.entries.find(e => e.date === today);
    const todayMood = todayEntry ? MOOD_EMOJIS.find(m => m.score === todayEntry.score) : null;
    await m.reply(claraWrap("Mood Stats", [
      "@" + m.sender.split("@")[0],
      "Total logged: " + udata.totalLogged + " hari",
      "Rata-rata: " + avg + "/10",
      "Hari ini: " + (todayMood ? todayMood.emoji + " " + todayMood.score + "/10" : "belum di-log"),
      "",
      prefix + "moodtrack log <1-10> - catat mood hari ini",
      prefix + "moodtrack insight - AI analisis",
    ].join("\n")), { mentions: [m.sender] });
    return { handled: true };
  }

  await m.reply(claraWrap("Mood Track", [
    "MOOD TRACKER",
    "",
    prefix + "moodtrack log <1-10> [catatan] - catat mood",
    prefix + "moodtrack history - 7 hari terakhir",
    prefix + "moodtrack insight - AI analisis pola",
    prefix + "moodtrack stats - statistik",
    "",
    "Skala 1-10: 1=😢 s/d 10=🚀",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
