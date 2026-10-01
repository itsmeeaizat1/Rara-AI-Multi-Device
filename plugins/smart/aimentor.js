// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { parseMention, delay } from "../../src/lib/nova-utils.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "aimentor",
  alias: ["aimentor"],
  category: "smart",
  description: "Sistem mentor-mentee match di grup",
  usage: ".aimentor <command>",
  example: ".aimentor daftar react",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

function getMentor(db, gid) {
  const all = db.setting("aimentor") || {};
  return all[gid] || { mentors: {}, mentees: {}, matches: [] };
}

function saveMentor(db, gid, data) {
  const all = db.setting("aimentor") || {};
  all[gid] = data;
  db.setting("aimentor", all);
  db.save();
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;

  // ==================== DAFTAR
  if (sub === "daftar" || sub === "register") {
    const role = (args[2] || "").toLowerCase();
    const skill = args.slice(3).join(" ").trim();

    if (!role || !["mentor", "mentee"].includes(role)) {
      await m.reply(novaWrap("Mentor Match", [
        "Format: " + prefix + "aimentor daftar <mentor|mentee> <skill>",
        "Contoh:",
        prefix + "aimentor daftar mentor javascript",
        prefix + "aimentor daftar mentee react",
      ].join("\n")));
      return { handled: true };
    }
    if (!skill) {
      await m.reply(novaWrap("Mentor Match", "Ketik skill yang kamu bisa/butuh.\n💡 *Contoh:* " + prefix + "aimentor daftar mentor python"));
      return { handled: true };
    }

    const data = getMentor(db, gid);
    if (role === "mentor") {
      data.mentors[m.sender] = { skill, name: m.pushName || "", joinedAt: Date.now() };
    } else {
      data.mentees[m.sender] = { skill, name: m.pushName || "", joinedAt: Date.now() };
    }
    saveMentor(db, gid, data);
    const label = role === "mentor" ? "Mentor" : "Mentee";
    await m.reply(novaWrap("Mentor Match", label + " terdaftar!\nSkill: " + skill + "\n\nKetik " + prefix + "aimentor cari untuk match."));
    return { handled: true };
  }

  // ==================== CARI / MATCH
  if (sub === "cari" || sub === "match" || sub === "cari") {
    const data = getMentor(db, gid);
    const isMentor = !!data.mentors[m.sender];
    const isMentee = !!data.mentees[m.sender];

    if (!isMentor && !isMentee) {
      await m.reply(novaWrap("Mentor Match", "Belum terdaftar. Ketik " + prefix + "aimentor daftar <mentor|mentee> <skill>."));
      return { handled: true };
    }

    if (isMentee) {
      const mySkill = data.mentees[m.sender].skill.toLowerCase();
      const matches = Object.entries(data.mentors).filter(([jid, v]) =>
        v.skill.toLowerCase().includes(mySkill) || mySkill.includes(v.skill.toLowerCase().split(" ")[0])
      );
      if (matches.length === 0) {
        await m.reply(novaWrap("Mentor Match", "Belum ada mentor yang cocok untuk: " + data.mentees[m.sender].skill));
        return { handled: true };
      }
      const list = matches.map(([jid, v], i) => (i + 1) + ". @" + jid.split("@")[0] + " - " + v.skill).join("\n");
      await m.reply(novaWrap("Mentor Match", "Mentor yang cocok:\n" + list), { mentions: matches.map(([jid]) => jid) });
      return { handled: true };
    }

    if (isMentor) {
      const mySkill = data.mentors[m.sender].skill.toLowerCase();
      const matches = Object.entries(data.mentees).filter(([jid, v]) =>
        v.skill.toLowerCase().includes(mySkill) || mySkill.includes(v.skill.toLowerCase().split(" ")[0])
      );
      if (matches.length === 0) {
        await m.reply(novaWrap("Mentor Match", "Belum ada mentee yang butuh: " + data.mentors[m.sender].skill));
        return { handled: true };
      }
      const list = matches.map(([jid, v], i) => (i + 1) + ". @" + jid.split("@")[0] + " - " + v.skill).join("\n");
      await m.reply(novaWrap("Mentor Match", "Mentee yang butuh bimbingan:\n" + list), { mentions: matches.map(([jid]) => jid) });
      return { handled: true };
    }
  }

  // ==================== LIST
  if (sub === "list" || sub === "daftarmentor") {
    const data = getMentor(db, gid);
    const mentorList = Object.entries(data.mentors).map(([jid, v], i) => (i + 1) + ". @" + jid.split("@")[0] + " - " + v.skill).join("\n") || "(kosong)";
    const menteeList = Object.entries(data.mentees).map(([jid, v], i) => (i + 1) + ". @" + jid.split("@")[0] + " - " + v.skill).join("\n") || "(kosong)";
    await m.reply(novaWrap("Mentor Directory", [
      "MENTOR:",
      mentorList,
      "",
      "MENTEE:",
      menteeList,
    ].join("\n")), {
      mentions: [...Object.keys(data.mentors), ...Object.keys(data.mentees)]
    });
    return { handled: true };
  }

  // ==================== KELUAR
  if (sub === "keluar" || sub === "undur") {
    const data = getMentor(db, gid);
    delete data.mentors[m.sender];
    delete data.mentees[m.sender];
    saveMentor(db, gid, data);
    await m.reply(novaWrap("Mentor Match", "Kamu keluar dari program mentor."));
    return { handled: true };
  }

  // ==================== HELP
  await m.reply(novaWrap("Mentor Match", [
    "AI MENTOR MATCH",
    "",
    "Cara pakai:",
    prefix + "aimentor daftar mentor <skill>",
    prefix + "aimentor daftar mentee <butuh>",
    prefix + "aimentor cari - match otomatis",
    prefix + "aimentor list - lihat semua",
    prefix + "aimentor keluar - keluar program",
    "",
    "Contoh:",
    prefix + "aimentor daftar mentor javascript",
    prefix + "aimentor daftar mentee python",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
