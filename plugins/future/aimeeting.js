// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";

const pluginConfig = {
  name: "aimeeting",
  alias: ["aimeeting", "aimeet", "meetingai"],
  category: "future",
  description: "AI Meeting Minutes - transcribe & notulen otomatis",
  usage: ".aimeeting <command>",
  example: ".aimeeting start 10",
  isOwner: false,
  isPremium: true,
  isGroup: true,
  isPrivate: false,
  cooldown: 30,
  energi: 3,
  isEnabled: true,
};

function getMeeting(db, gid) {
  const all = db.setting("aimeeting") || {};
  return all[gid] || null;
}

function saveMeeting(db, gid, data) {
  const all = db.setting("aimeeting") || {};
  all[gid] = data;
  db.setting("aimeeting", all);
  db.save();
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;

  // ==================== START
  if (sub === "start" || sub === "mulai") {
    if (!m.isOwner) {
      await m.reply(claraWrap("AI Meeting", "Khusus admin/owner."));
      return { handled: true };
    }
    const durasi = parseInt(args[2] || "10", 10);
    if (isNaN(durasi) || durasi < 1 || durasi > 60) {
      await m.reply(claraWrap("AI Meeting", "Format: " + prefix + "aimeeting start <durasi menit>\nContoh: " + prefix + "aimeeting start 10"));
      return { handled: true };
    }
    saveMeeting(db, gid, {
      active: true,
      startTime: Date.now(),
      duration: durasi,
      messages: [],
      startedBy: m.sender,
      topic: args.slice(3).join(" ") || "Meeting",
    });
    await m.reply(claraWrap("AI Meeting", [
      "Mode rapat AKTIF!",
      "Durasi: " + durasi + " menit",
      "Bot merekam semua pesan teks.",
      "",
      "Ketik " + prefix + "aimeeting stop untuk generate notulen.",
    ].join("\n")));
    return { handled: true };
  }

  // ==================== STOP
  if (sub === "stop" || sub === "selesai") {
    const meeting = getMeeting(db, gid);
    if (!meeting || !meeting.active) {
      await m.reply(claraWrap("AI Meeting", "Tidak ada rapat aktif."));
      return { handled: true };
    }

    if (meeting.messages.length < 3) {
      await m.reply(claraWrap("AI Meeting", "Terlalu sedikit pesan untuk dibuat notulen. Minimal 3 pesan."));
      return { handled: true };
    }

    await m.react("🕒");
    await m.reply(claraWrap("AI Meeting", "Menggenerate notulen dari " + meeting.messages.length + " pesan..."));

    try {
      const chatLog = meeting.messages.map(msg =>
        msg.sender.split("@")[0] + ": " + msg.text
      ).join("\n");

      const prompt = "Buat notulen meeting yang rapi dan terstruktur dari catatan chat berikut.\n" +
        "Topik: " + meeting.topic + "\n\n" +
        "Format:\n1. RINGKASAN (2-3 kalimat)\n2. POIN DISKUSI (bullet)\n3. ACTION ITEMS (siapa kerjain apa)\n4. KESIMPULAN\n\n" +
        "Catatan:\n" + chatLog.slice(0, 3000);

      const result = await UnlimitedAI(prompt, "nova-ai");
      const notulen = result?.success ? result.response : "Gagal generate notulen.";

      meeting.active = false;
      meeting.notulen = notulen;
      meeting.endTime = Date.now();
      saveMeeting(db, gid, meeting);

      await m.react("✅");
      await m.reply(claraWrap("AI Meeting Notulen", "Topik: " + meeting.topic + "\nPesan: " + meeting.messages.length + "\n\n" + notulen));
    } catch {
      await m.react("❌");
      await m.reply(claraWrap("AI Meeting", "Gagal generate notulen."));
    }
    return { handled: true };
  }

  // ==================== STATUS
  if (sub === "status" || sub === "cek") {
    const meeting = getMeeting(db, gid);
    if (!meeting) {
      await m.reply(claraWrap("AI Meeting", "Belum ada rapat. Ketik " + prefix + "aimeeting start <menit>."));
      return { handled: true };
    }
    if (meeting.active) {
      const elapsed = Math.floor((Date.now() - meeting.startTime) / 60000);
      const remaining = meeting.duration - elapsed;
      await m.reply(claraWrap("AI Meeting Status", [
        "Status: AKTIF",
        "Topik: " + meeting.topic,
        "Pesan terkumpul: " + meeting.messages.length,
        "Elapsed: " + elapsed + " menit",
        "Sisa: " + (remaining > 0 ? remaining + " menit" : "waktu habis"),
        "",
        "Ketik " + prefix + "aimeeting stop untuk generate notulen.",
      ].join("\n")));
    } else if (meeting.notulen) {
      await m.reply(claraWrap("AI Meeting Status", [
        "Status: Selesai",
        "Topik: " + meeting.topic,
        "Pesan: " + meeting.messages.length,
        "",
        "Ketik " + prefix + "aimeeting show untuk lihat notulen.",
      ].join("\n")));
    }
    return { handled: true };
  }

  // ==================== SHOW
  if (sub === "show" || sub === "lihat") {
    const meeting = getMeeting(db, gid);
    if (!meeting || !meeting.notulen) {
      await m.reply(claraWrap("AI Meeting", "Tidak ada notulen. Jalankan rapat dulu."));
      return { handled: true };
    }
    await m.reply(claraWrap("AI Meeting Notulen", "Topik: " + meeting.topic + "\n\n" + meeting.notulen));
    return { handled: true };
  }

  // ==================== HELP
  await m.reply(claraWrap("AI Meeting", [
    "AI MEETING MINUTES",
    "",
    "Cara pakai:",
    prefix + "aimeeting start <menit> [topik]",
    prefix + "aimeeting stop - generate notulen",
    prefix + "aimeeting status - cek progress",
    prefix + "aimeeting show - lihat notulen",
    "",
    "Contoh:",
    prefix + "aimeeting start 15 Evaluasi Sprint",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
