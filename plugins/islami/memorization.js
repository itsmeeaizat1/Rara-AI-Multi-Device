// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, tipText } from "../../src/lib/rara-menu-style.js";
import { runLiveTicker } from "../../src/lib/rara-countdown.js";

const pluginConfig = {
  name: "hafalan",
  alias: ["hafalan"],
  category: "islami",
  description: "Tracker hafalan Al-Quran - catat, review, spaced repetition",
  usage: ".hafalan <add/list/review/progress/remove/streak>",
  example: ".hafalan add Al-Fatihah 1-7",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// Spaced repetition intervals (in days)
const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60];

// Surah reference data (114 surah, name + total ayat)
const SURAHS = {
  1: ["Al-Fatihah", 7], 2: ["Al-Baqarah", 286], 3: ["Ali Imran", 200],
  4: ["An-Nisa", 176], 5: ["Al-Maidah", 120], 6: ["Al-An'am", 165],
  7: ["Al-A'raf", 206], 8: ["Al-Anfal", 75], 9: ["At-Taubah", 129],
  10: ["Yunus", 109], 11: ["Hud", 123], 12: ["Yusuf", 111],
  13: ["Ar-Ra'd", 43], 14: ["Ibrahim", 52], 15: ["Al-Hijr", 99],
  16: ["An-Nahl", 128], 17: ["Al-Isra", 111], 18: ["Al-Kahfi", 110],
  19: ["Maryam", 98], 20: ["Ta-Ha", 135], 21: ["Al-Anbiya", 112],
  22: ["Al-Hajj", 78], 23: ["Al-Mu'minun", 118], 24: ["An-Nur", 64],
  25: ["Al-Furqan", 77], 26: ["Asy-Syu'ara", 227], 27: ["An-Naml", 93],
  28: ["Al-Qasas", 88], 29: ["Al-Ankabut", 69], 30: ["Ar-Rum", 60],
  31: ["Luqman", 34], 32: ["As-Sajdah", 30], 33: ["Al-Ahzab", 73],
  34: ["Saba", 54], 35: ["Fatir", 45], 36: ["Ya-Sin", 83],
  37: ["As-Saffat", 182], 38: ["Sad", 88], 39: ["Az-Zumar", 75],
  40: ["Gafir", 85], 41: ["Fussilat", 54], 42: ["Asy-Syura", 53],
  43: ["Az-Zukhruf", 89], 44: ["Ad-Dukhan", 59], 45: ["Al-Jasiyah", 37],
  46: ["Al-Ahqaf", 35], 47: ["Muhammad", 38], 48: ["Al-Fath", 29],
  49: ["Al-Hujurat", 18], 50: ["Qaf", 45], 51: ["Ad-Dariyat", 60],
  52: ["At-Tur", 49], 53: ["An-Najm", 62], 54: ["Al-Qamar", 55],
  55: ["Ar-Rahman", 78], 56: ["Al-Waqi'ah", 96], 57: ["Al-Hadid", 29],
  58: ["Al-Mujadilah", 22], 59: ["Al-Hasyr", 24], 60: ["Al-Mumtahanah", 13],
  61: ["As-Saff", 14], 62: ["Al-Jumu'ah", 11], 63: ["Al-Munafiqun", 11],
  64: ["At-Tagabun", 18], 65: ["At-Talaq", 12], 66: ["At-Tahrim", 12],
  67: ["Al-Mulk", 30], 68: ["Al-Qalam", 52], 69: ["Al-Haqqah", 52],
  70: ["Al-Ma'arij", 44], 71: ["Nuh", 28], 72: ["Al-Jinn", 28],
  73: ["Al-Muzzammil", 20], 74: ["Al-Muddassir", 56], 75: ["Al-Qiyamah", 40],
  76: ["Al-Insan", 31], 77: ["Al-Mursalat", 50], 78: ["An-Naba", 40],
  79: ["An-Nazi'at", 46], 80: ["Abasa", 42], 81: ["At-Takwir", 29],
  82: ["Al-Infitar", 19], 83: ["Al-Mutaffifin", 36], 84: ["Al-Insyiqaq", 25],
  85: ["Al-Buruj", 22], 86: ["At-Tariq", 17], 87: ["Al-A'la", 19],
  88: ["Al-Gasyiyah", 26], 89: ["Al-Fajr", 30], 90: ["Al-Balad", 20],
  91: ["Asy-Syams", 15], 92: ["Al-Lail", 21], 93: ["Ad-Duha", 11],
  94: ["Asy-Syarh", 8], 95: ["At-Tin", 8], 96: ["Al-Alaq", 19],
  97: ["Al-Qadr", 5], 98: ["Al-Bayyinah", 8], 99: ["Az-Zalzalah", 8],
  100: ["Al-Adiyat", 11], 101: ["Al-Qari'ah", 11], 102: ["At-Takasur", 8],
  103: ["Al-Asr", 3], 104: ["Al-Humazah", 9], 105: ["Al-Fil", 5],
  106: ["Quraisy", 4], 107: ["Al-Ma'un", 7], 108: ["Al-Kausar", 3],
  109: ["Al-Kafirun", 6], 110: ["An-Nasr", 3], 111: ["Al-Lahab", 5],
  112: ["Al-Ikhlas", 4], 113: ["Al-Falaq", 5], 114: ["An-Nas", 6],
};

// Find surah by name (case insensitive, partial match)
function findSurah(input) {
  const query = input.toLowerCase().trim().replace(/[^a-z0-9'-]/g, "");
  // Direct number
  const num = parseInt(input);
  if (!isNaN(num) && num >= 1 && num <= 114) {
    return { num, name: SURAHS[num][0], totalAyat: SURAHS[num][1] };
  }
  // Search by name
  for (const [num, [name, total]] of Object.entries(SURAHS)) {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9'-]/g, "");
    if (cleanName === query || cleanName.startsWith(query) || query.startsWith(cleanName)) {
      return { num: parseInt(num), name, totalAyat: total };
    }
  }
  return null;
}

function formatDate(ts) {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return dd + "/" + mm + "/" + yyyy;
}

function daysBetween(ts1, ts2) {
  return Math.floor((ts2 - ts1) / 86400000);
}

// Get user hafalan data
function getHafalan(db, sender) {
  const all = db.setting("hafalan") || {};
  return all[sender] || { items: [], streak: { count: 0, lastDate: 0 }, createdAt: Date.now() };
}

function saveHafalan(db, sender, data) {
  const all = db.setting("hafalan") || {};
  all[sender] = data;
  db.setting("hafalan", all);
  db.save();
}

// Generate short ID
function genId() {
  return "HFZ-" + Math.random().toString(36).substring(2, 6).toUpperCase();
}

// Calculate next review date based on review count
function nextReview(reviewCount) {
  const intervalIdx = Math.min(reviewCount, REVIEW_INTERVALS.length - 1);
  const days = REVIEW_INTERVALS[intervalIdx];
  return Date.now() + days * 86400000;
}

// Get status label
function getStatus(item) {
  if (item.reviewCount === 0) return "Baru";
  if (item.reviewCount < 3) return "Belajar";
  if (item.reviewCount < 6) return "Hafalan";
  return "Mastery";
}

// Check and update streak
function updateStreak(data) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTs = today.getTime();
  const yesterdayTs = todayTs - 86400000;

  if (!data.streak) data.streak = { count: 0, lastDate: 0 };

  if (data.streak.lastDate === todayTs) {
    // Already counted today
    return;
  }

  if (data.streak.lastDate === yesterdayTs) {
    data.streak.count += 1;
  } else {
    data.streak.count = 1;
  }
  data.streak.lastDate = todayTs;
}

// 🔹 VARIASI (13 Sep): data waktu/mastery udah ada tapi gak dimunculin.
// list → ETA review per item; progress → meter status; streak → bar ke milestone;
// review terdekat ≤24 jam → kartu live countdown 🕒 → "📖 WAKTU REVIEW".
function buildMeter(pct, len = 10) {
  const filled = Math.max(0, Math.min(len, Math.round((pct / 100) * len)));
  return "▰".repeat(filled) + "▱".repeat(len - filled);
}

function fmtReviewEta(item, now) {
  const ms = item.nextReview - now;
  if (ms <= 0) return "🔴 Waktunya review!";
  const h = Math.floor(ms / 3600000);
  if (h < 1) {
    const mm = Math.floor(ms / 60000);
    return "🕒 " + mm + " mnt lagi";
  }
  if (h < 24) {
    const mm = Math.floor((ms % 3600000) / 60000);
    return "🕒 " + h + " jam " + mm + " mnt lagi";
  }
  const d = Math.round(h / 24);
  return "🕒 " + d + " hari lagi (" + formatDate(item.nextReview) + ")";
}

// 🔥 meter streak: bar persen menuju milestone berikutnya + api sesuai skala
function buildStreakBar(streakCount) {
  const milestones = [7, 30, 100, 365];
  const nextMilestone = milestones.find((ms) => ms > streakCount) || streakCount + 7;
  const prevMilestone = [...milestones].reverse().find((ms) => ms < streakCount) || 0;
  const span = nextMilestone - prevMilestone;
  const pct = span > 0 ? Math.min(100, Math.round(((streakCount - prevMilestone) / span) * 100)) : 100;
  const fire = streakCount >= 100 ? "🔥" : streakCount >= 30 ? "🔥🔥" : streakCount >= 7 ? "🔥" : "✨";
  return fire + " " + buildMeter(pct) + " " + pct + "% → milestone " + nextMilestone + " hari";
}

// kartu live countdown ke review terdekat (≤24 jam ke depan, belum due)
function fireHafalanTicker(db, sender, item, sock, m, prefix) {
  try {
    if (!item || !item.nextReview) return null;
    const now = Date.now();
    const rem = item.nextReview - now;
    if (rem <= 0 || rem > 24 * 3600000) return null; // sudah due / masih jauh
    const card = (remMs) => {
      if (remMs <= 0) {
        return [
          "📖 *waktu review!*",
          "",
          "Surah: *" + item.surahName + "* " + item.ayatStart + "-" + item.ayatEnd,
          "ID: `" + item.id + "`",
          "",
          "Ketik " + prefix + "hafalan review " + item.id + " setelah murajaah.",
        ].join("\n");
      }
      const h = Math.floor(remMs / 3600000);
      const mm = Math.floor((remMs % 3600000) / 60000);
      const ss = Math.floor((remMs % 60000) / 1000);
      return [
        "🕒 *review sedang dekat*",
        "",
        "Surah: *" + item.surahName + "* " + item.ayatStart + "-" + item.ayatEnd,
        "Status: " + getStatus(item),
        "🕒 Sisa: *" + h + " jam " + String(mm).padStart(2, "0") + " mnt " + String(ss).padStart(2, "0") + " dtk*",
        "",
        "Siapin murajaah-nya ya 🤲",
      ].join("\n");
    };
    return runLiveTicker({
      sock, chat: m.chat, m,
      mode: "down",
      targetTs: item.nextReview,
      initialCard: card(rem),
      tickCard: (st) => card(st.remainingMs),
      finalCard: () => [
        "✅ *Countdown review dibatalkan*",
        "",
        "Itemnya dihapus / udah direview — cek " + prefix + "hafalan list.",
      ].join("\n"),
      maxEdits: 600,
      isCancelled: () => {
        const cur = getHafalan(db, sender).items.find((it) => it.id === item.id);
        return !cur || cur.nextReview !== item.nextReview;
      },
    }).catch(() => {});
  } catch {
    return null;
  }
}

// cari review TERDEKAT yg belum due
function findNextUpcomingReview(data, now) {
  const upcoming = data.items.filter((it) => it.nextReview > now);
  return upcoming.sort((a, b) => a.nextReview - b.nextReview)[0] || null;
}

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const args = (m.text || "").trim().split(/\s+/);
    const action = args[0]?.toLowerCase() || "list";
    const db = getDatabase();
    const sender = m.sender || m.key?.participant || "";

    // --- ADD ---
    if (action === "add") {
      // Format: .hafalan add <surah> <ayat_start>-<ayat_end>
      // e.g: .hafalan add Al-Fatihah 1-7
      // e.g: .hafalan add 112 1-4
      const surahInput = args[1];
      const ayatRange = args[2];

      if (!surahInput) {
        return m.reply(
          prefix + "hafalan add <surah> <ayat_mulai-ayat_akhir>\n\n" +
          "Contoh:\n" +
          prefix + "hafalan add Al-Fatihah 1-7\n" +
          prefix + "hafalan add 112 1-4\n" +
          prefix + "hafalan add Ya-Sin 1-20\n\n" +
          "Surah bisa nama (Al-Fatihah) atau nomor (1-114)",
          { title: "Hafalan - Add" }
        );
      }

      const surah = findSurah(surahInput);
      if (!surah) {
        return m.reply(raraWrap("Hafalan", "Surah tidak ditemukan! Ketik nama atau nomor surah (1-114)"));
      }

      // Parse ayat range
      let ayatStart = 1, ayatEnd = surah.totalAyat;
      if (ayatRange) {
        const rangeParts = ayatRange.split("-");
        if (rangeParts.length === 2) {
          ayatStart = parseInt(rangeParts[0]);
          ayatEnd = parseInt(rangeParts[1]);
        } else {
          // Single ayat
          ayatStart = parseInt(rangeParts[0]);
          ayatEnd = ayatStart;
        }
      }

      if (isNaN(ayatStart) || isNaN(ayatEnd) || ayatStart < 1 || ayatEnd > surah.totalAyat || ayatStart > ayatEnd) {
        return m.reply(raraWrap("Hafalan", "Range ayat tidak valid! Surah " + surah.name + " punya " + surah.totalAyat + " ayat (1-" + surah.totalAyat + ")"));
      }

      const totalAyat = ayatEnd - ayatStart + 1;
      const data = getHafalan(db, sender);

      // Check for duplicate (same surah + overlapping range)
      const isDuplicate = data.items.some((item) => {
        if (item.surahNum !== surah.num) return false;
        return !(ayatEnd < item.ayatStart || ayatStart > item.ayatEnd);
      });

      if (isDuplicate) {
        return m.reply(raraWrap("Hafalan", "Range ayat ini sudah ada di hafalan kamu! Cek dengan " + prefix + "hafalan list"));
      }

      const item = {
        id: genId(),
        surahNum: surah.num,
        surahName: surah.name,
        ayatStart,
        ayatEnd,
        totalAyat,
        addedAt: Date.now(),
        lastReviewed: 0,
        nextReview: Date.now() + 86400000, // 1 day
        reviewCount: 0,
        mastery: 0, // 0-100
      };

      data.items.push(item);
      updateStreak(data);
      saveHafalan(db, sender, data);
      await m.reply(raraWrap("Hafalan",
        "Hafalan ditambahkan!\n" +
        "Surah: *" + surah.name + "* (" + surah.num + ")\n" +
        "Ayat: " + ayatStart + "-" + ayatEnd + " (" + totalAyat + " ayat)\n" +
        "ID: `" + item.id + "`\n" +
        "Status: Baru\n" +
        "Review pertama: " + fmtReviewEta(item, Date.now()) + "\n\n" +
        tipText("Ketik " + prefix + "hafalan review " + item.id + " setelah menghafal")
      ));
      fireHafalanTicker(db, sender, item, sock, m, prefix); // 🔹 24 jam → live countdown
      return;
    }

    // --- LIST ---
    if (action === "list") {
      const data = getHafalan(db, sender);
      if (data.items.length === 0) {
        return m.reply(raraWrap("Hafalan", "Belum ada hafalan.\nTambah: " + prefix + "hafalan add <surah> <ayat>"));
      }

      const now = Date.now();
      let lines = [];
      let dueCount = 0;

      // Sort by next review (most urgent first)
      const sorted = [...data.items].sort((a, b) => a.nextReview - b.nextReview);

      // 🔹 meter: rata2 mastery + review due
      const avgMastery = Math.round(data.items.reduce((s, it) => s + (it.mastery || 0), 0) / data.items.length);
      lines.push("📊 Mastery: " + buildMeter(avgMastery) + " " + avgMastery + "%");
      lines.push("");

      sorted.forEach((item) => {
        const due = item.nextReview <= now;
        if (due) dueCount++;
        lines.push(
          item.id + " | " + item.surahName + " " + item.ayatStart + "-" + item.ayatEnd +
          " | " + getStatus(item) + " | " + fmtReviewEta(item, now)
        );
      });

      lines.push("");
      lines.push("Total: " + data.items.length + " hafalan (" + dueCount + " perlu review)");

      if (dueCount > 0) {
        lines.push("");
        lines.push(tipText("Ketik " + prefix + "hafalan review untuk mulai review"));
      }

      const res = await m.reply(raraWrap("Daftar Hafalan", lines.join("\n")));
      fireHafalanTicker(db, sender, findNextUpcomingReview(data, now), sock, m, prefix); // 🔹 ≤24 jam → live countdown
      return res;
    }

    // --- REVIEW ---
    if (action === "review") {
      const itemId = args[1]?.toUpperCase();
      const data = getHafalan(db, sender);

      if (!itemId) {
        // Find most urgent due item
        const now = Date.now();
        const dueItems = data.items.filter((item) => item.nextReview <= now);
        if (dueItems.length === 0) {
          return m.reply(raraWrap("Hafalan", "Tidak ada hafalan yg perlu di-review sekarang."));
        }
        const next = dueItems.sort((a, b) => a.nextReview - b.nextReview)[0];
        return m.reply(raraWrap("Review Hafalan",
          "Hafalan untuk di-review:\n" +
          "Surah: *" + next.surahName + "* (" + next.surahNum + ")\n" +
          "Ayat: " + next.ayatStart + "-" + next.ayatEnd + " (" + next.totalAyat + " ayat)\n" +
          "ID: `" + next.id + "`\n" +
          "Review ke: " + (next.reviewCount + 1) + "\n\n" +
          "Setelah selesai, ketik:\n" +
          prefix + "hafalan review " + next.id + " ok\n" +
          "atau\n" +
          prefix + "hafalan review " + next.id + " ulang"
        ));
      }

      const item = data.items.find((it) => it.id === itemId);
      if (!item) {
        return m.reply(raraWrap("Hafalan", "Hafalan `" + itemId + "` tidak ditemukan"));
      }

      const result = args[2]?.toLowerCase() || "";

      if (result === "ok" || result === "lancar" || result === "good") {
        // Successful review
        item.reviewCount += 1;
        item.lastReviewed = Date.now();
        item.nextReview = nextReview(item.reviewCount);
        item.mastery = Math.min(100, Math.round((item.reviewCount / (REVIEW_INTERVALS.length)) * 100));

        updateStreak(data);
        saveHafalan(db, sender, data);
        await m.reply(raraWrap("Review Selesai",
          "MasyaAllah! Review tercatat.\n" +
          "Surah: *" + item.surahName + "* " + item.ayatStart + "-" + item.ayatEnd + "\n" +
          "Review ke: " + item.reviewCount + "\n" +
          "Status: " + getStatus(item) + "\n" +
          "Mastery: " + item.mastery + "% " + buildMeter(item.mastery) + "\n" +
          "Review berikutnya: " + fmtReviewEta(item, Date.now()) + "\n\n" +
          "Streak hafalan: " + data.streak.count + " hari"
        ));
        fireHafalanTicker(db, sender, item, sock, m, prefix); // 🔹 review berikutnya ≤24 jam → countdown
        return;
      } else if (result === "ulang" || result === "lagi" || result === "fail") {
        // Failed review - reset to beginning
        item.reviewCount = 0;
        item.lastReviewed = Date.now();
        item.nextReview = Date.now() + 86400000; // Tomorrow
        item.mastery = Math.max(0, item.mastery - 20);

        saveHafalan(db, sender, data);
        return m.reply(raraWrap("Review Diulang",
          "Tidak apa-apa, tetap semangat!\n" +
          "Surah: *" + item.surahName + "* " + item.ayatStart + "-" + item.ayatEnd + "\n" +
          "Review direset ke awal\n" +
          "Mastery: " + item.mastery + "%\n" +
          "Review berikutnya: besok\n\n" +
          tipText("Baca ulang ayatnya, lalu review lagi besok")
        ));
      } else {
        // Show review prompt
        return m.reply(raraWrap("Review Hafalan",
          "Surah: *" + item.surahName + "* (" + item.surahNum + ")\n" +
          "Ayat: " + item.ayatStart + "-" + item.ayatEnd + " (" + item.totalAyat + " ayat)\n" +
          "Review ke: " + (item.reviewCount + 1) + "\n" +
          "Status: " + getStatus(item) + "\n\n" +
          "Setelah menghafal/murajaah, ketik:\n" +
          prefix + "hafalan review " + item.id + " ok (lancar)\n" +
          prefix + "hafalan review " + item.id + " ulang (belum lancar)"
        ));
      }
    }

    // --- PROGRESS ---
    if (action === "progress") {
      const data = getHafalan(db, sender);
      if (data.items.length === 0) {
        return m.reply(raraWrap("Hafalan", "Belum ada hafalan. Mulai dengan " + prefix + "hafalan add <surah> <ayat>"));
      }

      const totalAyat = data.items.reduce((sum, item) => sum + item.totalAyat, 0);
      const totalSurah = new Set(data.items.map((item) => item.surahNum)).size;
      const avgMastery = Math.round(data.items.reduce((sum, item) => sum + item.mastery, 0) / data.items.length);
      const masteredCount = data.items.filter((item) => item.reviewCount >= 6).length;
      const learningCount = data.items.filter((item) => item.reviewCount > 0 && item.reviewCount < 6).length;
      const newCount = data.items.filter((item) => item.reviewCount === 0).length;

      // Due reviews
      const now = Date.now();
      const dueCount = data.items.filter((item) => item.nextReview <= now).length;

      // Juz estimate (rough: 1 juz ~ 600 ayat)
      const juzEstimate = (totalAyat / 600 * 10) / 10;

      let lines = [
        "Total Hafalan: " + data.items.length + " item",
        "Total Ayat: " + totalAyat + " ayat",
        "Total Surah: " + totalSurah + " surah",
        "Estimasi Juz: " + juzEstimate.toFixed(1) + " juz",
        "",
        "Mastery: " + avgMastery + "%",
        "Mastery (6+ review): " + masteredCount + " item",
        "Belajar (1-5 review): " + learningCount + " item",
        "Baru (0 review): " + newCount + " item",
        "",
        "Streak: *" + data.streak.count + " hari*",
        "Perlu review: " + dueCount + " item",
      ];

      // 🔹 meter breakdown status + streak bar (13 Sep)
      lines.push("");
      lines.push("📊 Mastery: " + buildMeter(avgMastery) + " " + avgMastery + "%");
      lines.push("✅ Mastery: " + buildMeter(Math.round((masteredCount / data.items.length) * 100)) + " " + masteredCount + "/" + data.items.length + " item");
      lines.push("");
      lines.push(buildStreakBar(data.streak.count));
      lines.push("");

      const res = await m.reply(raraWrap("Progress Hafalan", lines.join("\n")));
      fireHafalanTicker(db, sender, findNextUpcomingReview(data, now), sock, m, prefix); // 🔹 ≤24 jam → live countdown
      return res;
    }

    // --- REMOVE ---
    if (action === "remove") {
      const itemId = args[1]?.toUpperCase();
      if (!itemId) {
        return m.reply(raraWrap("Hafalan", "Format: " + prefix + "hafalan remove <ID>"));
      }

      const data = getHafalan(db, sender);
      const idx = data.items.findIndex((it) => it.id === itemId);
      if (idx === -1) {
        return m.reply(raraWrap("Hafalan", "Hafalan `" + itemId + "` tidak ditemukan"));
      }

      const removed = data.items[idx];
      data.items.splice(idx, 1);
      saveHafalan(db, sender, data);
      return m.reply(raraWrap("Hafalan", "Hafalan *" + removed.surahName + " " + removed.ayatStart + "-" + removed.ayatEnd + "* dihapus"));
    }

    // --- STREAK ---
    if (action === "streak") {
      const data = getHafalan(db, sender);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTs = today.getTime();

      const isToday = data.streak.lastDate === todayTs;
      const streakCount = data.streak.count;

      let lines = [
        "Streak saat ini: *" + streakCount + " hari*",
        "Terakhir aktif: " + (data.streak.lastDate > 0 ? formatDate(data.streak.lastDate) : "Belum pernah"),
        "Status hari ini: " + (isToday ? "Sudah menghafal/review" : "Belum menghafal hari ini"),
      ];

      // 🔹 bar ke milestone + api skala (13 Sep)
      lines.push("");
      lines.push(buildStreakBar(streakCount));

      if (!isToday) {
        lines.push("");
        lines.push(tipText("Ketik " + prefix + "hafalan add atau " + prefix + "hafalan review untuk lanjut streak!"));
      }

      const res = await m.reply(raraWrap("Streak Hafalan", lines.join("\n")));
      fireHafalanTicker(db, sender, findNextUpcomingReview(data, Date.now()), sock, m, prefix); // 🔹 ≤24 jam → live countdown
      return res;
    }

    // --- HELP / default ---
    return m.reply(
      prefix + "hafalan add <surah> <ayat_mulai-ayat_akhir>\n" +
      prefix + "hafalan list\n" +
      prefix + "hafalan review [ID] [ok/ulang]\n" +
      prefix + "hafalan progress\n" +
      prefix + "hafalan remove <ID>\n" +
      prefix + "hafalan streak\n\n" +
      "Spaced repetition: 1, 3, 7, 14, 30, 60 hari\n" +
      "Surah: nama (Al-Fatihah) atau nomor (1-114)",
      { title: "Hafalan - Menu" }
    );
  } catch (e) {
    console.error("hafalan error:", e);
    return m.reply(raraWrap("Hafalan", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
