// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "breathing",
  alias: ["breathing"],
  category: "future",
  description: "Guided breathing exercise - 4-7-8 technique untuk relaksasi",
  usage: ".breathing <command>",
  example: ".breathing start",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const TECHNIQUES = {
  "478": { name: "4-7-8 Relaxing", inhale: 4, hold: 7, exhale: 8, cycles: 4, desc: "Teknik relaksasi mendalam, baik untuk tidur & anxiety" },
  "box": { name: "Box Breathing", inhale: 4, hold: 4, exhale: 4, hold2: 4, cycles: 4, desc: "Teknik Navy SEAL, untuk fokus & kalmer" },
  "444": { name: "Equal Breathing", inhale: 4, exhale: 4, cycles: 6, desc: "Sederhana & seimbang, cocok pemula" },
  "coherent": { name: "Coherent Breathing", inhale: 5, exhale: 5, cycles: 6, desc: "Detak jantung harmonis, anti stress" },
};

function getConfig(db, gid) {
  const all = db.setting("breathing") || {};
  return all[gid] || {};
}

function saveConfig(db, gid, data) {
  const all = db.setting("breathing") || {};
  all[gid] = data;
  db.setting("breathing", all);
  db.save();
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const cfg = getConfig(db, gid);

  if (!cfg[m.sender]) {
    cfg[m.sender] = { totalSessions: 0, totalMinutes: 0, lastSession: null, streak: 0 };
  }
  const udata = cfg[m.sender];

  if (sub === "start" || sub === "mulai" || !sub) {
    const techniqueKey = (args[2] || "478").toLowerCase();
    const technique = TECHNIQUES[techniqueKey] || TECHNIQUES["478"];

    udata.totalSessions++;
    const totalSeconds = technique.inhale + (technique.hold || 0) + technique.exhale + (technique.hold2 || 0);
    const totalMinutes = Math.ceil((totalSeconds * technique.cycles) / 60);
    udata.totalMinutes += totalMinutes;

    // Streak logic
    const today = new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
    if (udata.lastSession === today) {
      // already done today, no streak change
    } else if (udata.lastSession === yesterday) {
      udata.streak++;
    } else {
      udata.streak = 1;
    }
    udata.lastSession = today;
    saveConfig(db, gid, cfg);

    // Build breathing guide
    const steps = [];
    for (let i = 0; i < technique.cycles; i++) {
      steps.push("Siklus " + (i + 1) + "/" + technique.cycles);
      steps.push("inhale " + technique.inhale + " detik...");
      if (technique.hold) steps.push("tahan " + technique.hold + " detik...");
      steps.push("exhale " + technique.exhale + " detik...");
      if (technique.hold2) steps.push("tahan " + technique.hold2 + " detik...");
      steps.push("");
    }

    await m.reply(claraWrap("Breathing Exercise", [
      "Teknik: " + technique.name,
      technique.desc,
      "",
      "Siklus: " + technique.cycles,
      "Total: ~" + totalMinutes + " menit",
      "",
      "Ikuti instruksi berikut:",
      "",
      steps.join("\n"),
      "",
      "Sesi selesai! Total sesi: " + udata.totalSessions + " | Streak: " + udata.streak + " hari",
      "",
      "Tips: Tarik napas dari hidung, buang dari mulut.",
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "stats" || sub === "cek" || sub === "statistik") {
    await m.reply(claraWrap("Breathing Stats", [
      "@" + m.sender.split("@")[0],
      "Total sesi: " + udata.totalSessions,
      "Total menit: " + udata.totalMinutes,
      "Streak: " + udata.streak + " hari",
      "Last session: " + (udata.lastSession || "belum"),
    ].join("\n")), { mentions: [m.sender] });
    return { handled: true };
  }

  if (sub === "techniques" || sub === "teknik" || sub === "list") {
    const list = Object.entries(TECHNIQUES).map(([key, t]) => key + " - " + t.name + "\n   " + t.desc + "\n   Inhale:" + t.inhale + "s Hold:" + (t.hold || 0) + "s Exhale:" + t.exhale + "s" + (t.hold2 ? " Hold2:" + t.hold2 + "s" : "") + " | " + t.cycles + " cycles").join("\n\n");
    await m.reply(claraWrap("Breathing Techniques", list + "\n\n" + prefix + "breathing start <teknik> untuk mulai"));
    return { handled: true };
  }

  await m.reply(claraWrap("Breathing", [
    "GUIDED BREATHING EXERCISE",
    "",
    prefix + "breathing start [teknik] - mulai sesi",
    prefix + "breathing techniques - lihat semua teknik",
    prefix + "breathing stats - statistik kamu",
    "",
    "Teknik:",
    "478 - 4-7-8 Relaxing (tidur, anxiety)",
    "box - Box Breathing (fokus, kalmer)",
    "444 - Equal Breathing (pemula)",
    "coherent - Coherent (anti stress)",
    "",
    "Tarik napas dari hidung, buang dari mulut.",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
