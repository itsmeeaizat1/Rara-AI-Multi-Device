// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader,
    separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "anniversarymatch",
  alias: ["anniversarymatch", "anni", "harijadian"],
  category: "rpg",
  description: "Cek hari jadian/nikah & countdown anniversary",
  usage: ".anniversary",
  example: ".anniversary",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function formatDuration(ms) {
  if (!ms || ms <= 0) return "0 hari";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days >= 1) return days + " hari " + hours + " jam";
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours >= 1) return hours + " jam " + mins + " menit";
  return mins + " menit";
}

function getNextAnniversary(startMs) {
  const now = Date.now();
  const startDate = new Date(startMs);
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();
  const startDay = startDate.getDate();

  for (let years = 1; years <= 100; years++) {
    const nextAnniv = new Date(startYear + years, startMonth, startDay).getTime();
    if (nextAnniv > now) {
      return { years, date: nextAnniv, msUntil: nextAnniv - now };
    }
  }
  return null;
}

function getMilestone(days) {
  if (days >= 365) return "1 Tahun! Selamat datang!";
  if (days >= 180) return "6 Bulan! Setengah tahun cinta!";
  if (days >= 100) return "100 Hari! Triple digits!";
  if (days >= 90) return "3 Bulan! Mantap!";
  if (days >= 60) return "2 Bulan! Tetap semangat!";
  if (days >= 30) return "1 Bulan! Bulan madu!";
  if (days >= 14) return "2 Minggu! Dua minggu penuh cinta!";
  if (days >= 7) return "1 Minggu! Seminggu bareng!";
  if (days >= 1) return "1 Hari! Baru dimulai!";
  return "Baru saja! Selamat!";
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    const user = db.getUser(m.sender);
    const rpg = user?.rpg || {};
    const now = Date.now();

    const isMarried = !!rpg.spouse;
    const partnerJid = rpg.spouse || rpg.dating;
    const startDate = rpg.marriedAt || rpg.datingAt;
    const statusLabel = isMarried ? "Menikah" : "Pacaran";
    const statusEmoji = isMarried ? "💍" : "💕";

    if (!partnerJid || !startDate) {
      const text =
        claraHeader("Anniversary", statusEmoji) + "\n\n" +
        claraWrap("status", [`◦ Status: *Belum punya pasangan*`, `◦ Belum ada hari jadian atau nikah`].join("\n")) + "\n\n" +
        separator("━", 22) + "\n" +
        tipText(`Ketik ${prefix}jadian @target untuk mulai cerita cinta`);

      await sendReplyWithNav(sock, m, text, "anniversary");
      return { handled: true };
    }

    const partner = db.getUser(partnerJid);
    const partnerName = partner?.name || partnerJid.split("@")[0];
    const userName = m.pushName || user?.name || "Player";

    const duration = now - startDate;
    const days = Math.floor(duration / 86400000);
    const dateStr = new Date(startDate).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const milestone = getMilestone(days);

    // Hitung anniversary berikutnya
    const nextAnniv = getNextAnniversary(startDate);
    let annivInfo = [];
    if (nextAnniv) {
      const annivDate = new Date(nextAnniv.date).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const daysUntil = Math.floor(nextAnniv.msUntil / 86400000);
      annivInfo.push(`◦ Anniversary ke: *${nextAnniv.years} tahun*`);
      annivInfo.push(`◦ Tanggal: *${annivDate}*`);
      annivInfo.push(`◦ Countdown: *${daysUntil} hari lagi*`);
    }

    // Affection dan bond level
    const affection = rpg.affection || 0;
    const bondLevel = Math.floor(affection / 100) + 1;

    const text =
      claraHeader("Anniversary", statusEmoji) + "\n\n" +
      claraWrap("anniversary", [
        `◦ Kamu: *${userName}*`,
        `◦ Pasangan: *${partnerName}*`,
        `◦ Status: *${statusLabel}* ${statusEmoji}`,
        `◦ Tanggal: *${dateStr}*`,
        `◦ Durasi: *${formatDuration(duration)}*`,
        `◦ Hari ke: *${days}*`,
        `◦ Milestone: *${milestone}*`,
      ]) + "\n\n" +
      claraWrap("bond", [`◦ Affection: *${affection}*`, `◦ Bond Level: *${bondLevel}*`, ...annivInfo].join("\n")) + "\n\n" +
      separator("━", 22) + "\n" +
      tipText(`Tingkatkan affection: ${prefix}cuddling, ${prefix}kiss, ${prefix}sayang, ${prefix}kado`);

    await sock.sendMessage(m.chat, {
      text,
      mentions: [m.sender, partnerJid],
    });

    return { handled: true };
  } catch (error) {
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) + "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("anniversary", text));
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
