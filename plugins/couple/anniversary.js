// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import moment from "moment-timezone";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "anniversary",
  alias: ["anniversary"],
  category: "couple",
  description: "Tracker anniversary/hari jadian dengan countdown",
  usage:
    ".anniversary — Cek anniversary kamu\n.anniversary set <tanggal> — Set tanggal jadian (DD/MM/YYYY)\n.anniversary @tag — Cek anniversary orang lain\n.anniversary list — Top anniversary di grup\n.anniversary delete — Hapus data anniversary",
  example: ".anniversary set 14/02/2024",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const TZ = "Asia/Jakarta";

function formatDate(ts) {
  if (!ts) return "-";
  return moment(ts).tz(TZ).format("DD MMMM YYYY");
}

function getDaysDiff(ts) {
  const now = moment().tz(TZ);
  const then = moment(ts).tz(TZ);
  return now.diff(then, "days");
}

function getNextAnniversary(ts) {
  const now = moment().tz(TZ);
  const then = moment(ts).tz(TZ);
  const nextAnni = then.clone().year(now.year());

  if (nextAnni.isBefore(now, "day")) {
    nextAnni.add(1, "year");
  }

  return nextAnni;
}

function getOrdinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getMilestone(days) {
  if (days >= 3650) return { label: "DEKADE CINTA", emoji: "💎" };
  if (days >= 365 * 5) return { label: "5 TAHUN+ SEMANGAT!", emoji: "💍" };
  if (days >= 365 * 3) return { label: "3 TAHUN+ TEGUH!", emoji: "🏆" };
  if (days >= 365 * 2) return { label: "2 TAHUN+ SETIA!", emoji: "🌹" };
  if (days >= 365) return { label: "1 TAHUN+ CINTA!", emoji: "💝" };
  if (days >= 180) return { label: "6 BULAN+ BERSAMA!", emoji: "💖" };
  if (days >= 90) return { label: "3 BULAN+ AWET!", emoji: "💕" };
  if (days >= 30) return { label: "1 BULAN+ BERJALAN!", emoji: "💗" };
  if (days >= 7) return { label: "1 MINGGU+ COBA!", emoji: "💘" };
  return { label: "BARU DIMULAI", emoji: "" };
}

function getCountdownText(target) {
  const now = moment().tz(TZ);
  const diff = moment.duration(target.diff(now));

  const months = Math.floor(diff.asMonths());
  const days = diff.days();
  const hours = diff.hours();
  const minutes = diff.minutes();

  let txt = "";
  if (months > 0) txt += months + " bulan ";
  if (days > 0) txt += days + " hari ";
  if (hours > 0) txt += hours + " jam ";
  if (minutes > 0) txt += minutes + " menit ";
  if (!txt) txt = "Hari ini!";

  return txt.trim();
}

function getLoveQuote(days) {
  const quotes = {
    short: [
      "Setiap hari bersamamu adalah hadiah",
      "Masih awal, tapi semoga berkelanjutan",
      "Perjalanan baru saja dimulai",
    ],
    medium: [
      "Cinta kita tumbuh lebih kuat setiap hari",
      "Bersamamu, waktu terasa begitu indah",
      "Setiap detik bersamamu adalah kenangan",
    ],
    long: [
      "Sudah sekian hari, dan aku masih memilih kamu",
      "Cinta ini bukan lagi sekadar rasa, tapi janji",
      "Bersama kamu, hari-hari terasa lebih bermakna",
    ],
    milestone: [
      "Kita sudah melewati banyak rintangan bersama",
      "Cinta sejati bukan tentang lama, tapi tentang setia",
      "Terima kasih sudah tetap di sini selama ini",
    ],
  };

  let pool;
  if (days >= 365) pool = quotes.milestone;
  else if (days >= 90) pool = quotes.long;
  else if (days >= 30) pool = quotes.medium;
  else pool = quotes.short;

  return pool[Math.floor(Math.random() * pool.length)];
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const arg = (m.args?.[0] || "").toLowerCase();

  // === NO ARGS: SHOW OWN ANNIVERSARY ===
  if (!arg || arg === "info" || arg === "cek") {
    let targetJid = m.sender;
    let isOther = false;

    if (m.quoted) {
      targetJid = m.quoted.sender || m.quoted.participant;
      isOther = true;
    } else if (m.mentionedJid?.length > 0) {
      targetJid = m.mentionedJid[0];
      isOther = true;
    }

    const userData = db.getUser(targetJid) || {};
    const fun = userData.fun || {};

    let anniTs = fun.jadiPacar;
    let partner = fun.pasangan;

    // If no jadiPacar but has custom anniversary date
    if (!anniTs && fun.anniversaryDate) {
      anniTs = fun.anniversaryDate;
    }

    if (!anniTs) {
      const tip = isOther
        ? "Orang ini belum punya data anniversary"
        : "Kamu belum punya data anniversary. Set dengan .anniversary set DD/MM/YYYY";
      return m.reply(tip);
    }

    const days = getDaysDiff(anniTs);
    const nextAnni = getNextAnniversary(anniTs);
    const anniYear = nextAnni.year() - moment(anniTs).tz(TZ).year();
    const milestone = getMilestone(days);
    const quote = getLoveQuote(days);
    const countdown = getCountdownText(nextAnni);

    let txt = "ANNIVERSARY TRACKER\n\n";
    txt += isOther
      ? "Pasangan: @" + targetJid.split("@")[0] + "\n"
      : "Pasangan: Kamu";
    if (partner) {
      txt += "Dengan: @" + partner.split("@")[0] + "\n";
    }
    txt += "\nTanggal Jadian: " + formatDate(anniTs) + "\n";
    txt += "Hari Ke: " + days + " hari\n";
    txt += "Milestone: " + milestone.emoji + " " + milestone.label + "\n";
    txt += "\nANNIVERSARY BERIKUTNYA\n";
    txt += getOrdinal(anniYear) + " Anniversary\n";
    txt += "Tanggal: " + nextAnni.format("DD MMMM YYYY") + "\n";
    txt += "Countdown: " + countdown + "\n";
    txt += "\n\"" + quote + "\"";

    return m.reply(claraWrap("anniversary", txt));
  }

  // === SET ANNIVERSARY DATE ===
  if (arg === "set" || arg === "atur" || arg === "tetapkan") {
    const dateStr = m.args?.[1] || "";

    if (!dateStr) {
      return m.reply(claraWrap("Anniversary", "Cara set anniversary:\n.anniversary set DD/MM/YYYY\n\nContoh:\n.anniversary set 14/02/2024\n.anniversary set 01/01/2023"));
    }

    // Parse DD/MM/YYYY
    const parts = dateStr.split(/[\/\-.]/);
    if (parts.length !== 3) {
      return m.reply(claraWrap("anniversary", "Format tanggal salah. Gunakan: DD/MM/YYYY\n\n💡 *Contoh:* .anniversary set 14/02/2024"));
    }

    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parseInt(parts[2]);

    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return m.reply(novaError("Anniversary", "Format tanggal gak valid nih! Gunakan: DD/MM/YYYY"));
    }

    const anniDate = moment.tz({ day, month, year }, TZ);

    if (!anniDate.isValid()) {
      return m.reply(novaError("Anniversary", "Tanggal gak valid nih! Cek format: DD/MM/YYYY"));
    }

    if (anniDate.isAfter(moment().tz(TZ), "day")) {
      return m.reply(claraWrap("anniversary", "Tanggal anniversary tidak bisa di masa depan!"));
    }

    const userData = db.getUser(m.sender) || {};
    if (!userData.fun) userData.fun = {};

    userData.fun.anniversaryDate = anniDate.valueOf();
    // Also set jadiPacar if not already set (from tembak/terima)
    if (!userData.fun.jadiPacar) {
      userData.fun.jadiPacar = anniDate.valueOf();
    }

    db.setUser(m.sender, userData);
    db.save();

    const days = getDaysDiff(anniDate.valueOf());

    let txt = "ANNIVERSARY DISET\n\n";
    txt += "Tanggal: " + anniDate.format("DD MMMM YYYY") + "\n";
    txt += "Hari ke: " + days + " hari\n";
    txt += "Anniversary ke-1: " + anniDate.clone().add(1, "year").format("DD MMMM YYYY") + "\n";
    txt += "\nCek kapan saja dengan .anniversary";

    return m.reply(claraWrap("anniversary", txt));
  }

  // === LIST ANNIVERSARIES IN GROUP ===
  if (arg === "list" || arg === "top" || arg === "papan") {
    try {
    await m.react("🕒");
      const groupMeta = await sock.groupMetadata(m.chat);
      const participants = groupMeta.participants || [];

      const anniList = [];

      for (const p of participants) {
        const jid = p.id || p.jid;
        const userData = db.getUser(jid) || {};
        const fun = userData.fun || {};
        const ts = fun.jadiPacar || fun.anniversaryDate;

        if (ts) {
          const days = getDaysDiff(ts);
          anniList.push({ jid, days, ts, name: userData.nama || jid.split("@")[0] });
        }
      }

      if (anniList.length === 0) {
        return m.reply(claraWrap("anniversary", "Belum ada member di grup ini yang punya data anniversary."));
      }

      // Sort by days descending (longest relationship first)
      anniList.sort((a, b) => b.days - a.days);

      let txt = "TOP ANNIVERSARY GRUP\n\n";
      const max = Math.min(anniList.length, 15);

      for (let i = 0; i < max; i++) {
        const a = anniList[i];
        const milestone = getMilestone(a.days);
        txt += (i + 1) + ". @" + a.jid.split("@")[0] + "\n";
        txt += "   " + a.days + " hari (" + milestone.emoji + " " + milestone.label + ")\n";
        txt += "   Sejak: " + formatDate(a.ts) + "\n";
      }

      if (anniList.length > 15) {
        txt += "\n... dan " + (anniList.length - 15) + " lainnya";
      }

      return m.reply(claraWrap("anniversary", txt));
    } catch (e) {
    await m.react("❌");
      return m.reply(novaError("Anniversary", "Gagal ambil data nih: " + e.message));
    }
  }

  // === DELETE ANNIVERSARY ===
  if (arg === "delete" || arg === "hapus" || arg === "reset") {
    const userData = db.getUser(m.sender) || {};
    const fun = userData.fun || {};

    if (!fun.jadiPacar && !fun.anniversaryDate) {
      return m.reply(claraWrap("anniversary", "Kamu belum punya data anniversary untuk dihapus."));
    }

    // Only delete custom anniversary date, keep jadiPacar from terima
    if (fun.anniversaryDate) {
      delete userData.fun.anniversaryDate;
    }
    // If jadiPacar exists from custom set (not from terima/tembak), delete it too
    if (fun.jadiPacar && !fun.pasangan) {
      delete userData.fun.jadiPacar;
    }

    db.setUser(m.sender, userData);
    db.save();

    return m.reply(claraWrap("Anniversary", "Data anniversary kamu telah dihapus."));
  }

  // === HELP ===
  await m.react("🐣");
  return m.reply( [
    "ANNIVERSARY TRACKER",
    "",
    "1. .anniversary — Cek anniversary kamu",
    "2. .anniversary set DD/MM/YYYY — Set tanggal jadian",
    "3. .anniversary @tag — Cek anniversary orang lain",
    "4. .anniversary list — Top anniversary di grup",
    "5. .anniversary delete — Hapus data anniversary",
    "",
    "Auto-terintegrasi dengan .tembak & .terima",
    "Jika sudah jadian via bot, tanggal otomatis terisi",
  ].join("\n"), "anniversary");
}

export { pluginConfig as config, handler };
