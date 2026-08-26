// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "autosurvey",
  alias: ["autosurvey"],
  category: "future",
  description: "Auto survey/poll mingguan ke grup",
  usage: ".autosurvey <command>",
  example: ".autosurvey add Rate aktivitas grup minggu ini 1-10",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

function getConfig(db, gid) {
  const all = db.setting("autosurvey") || {};
  if (!all[gid]) {
    all[gid] = { enabled: false, day: 0, surveys: [], results: {}, currentSurvey: null, lastSent: 0 };
    db.setting("autosurvey", all);
  }
  return all[gid];
}

function saveConfig(db, gid, data) {
  const all = db.setting("autosurvey") || {};
  all[gid] = data;
  db.setting("autosurvey", all);
  db.save();
}

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const cfg = getConfig(db, gid);

  if (sub === "on" || sub === "enable") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Survey", "Khusus owner."));
      return { handled: true };
    }
    cfg.enabled = true;
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Survey", "AKTIF!\nHari: " + DAYS[cfg.day] + "\nBot kirim survey otomatis tiap minggu."));
    return { handled: true };
  }

  if (sub === "off" || sub === "disable") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Survey", "Khusus owner."));
      return { handled: true };
    }
    cfg.enabled = false;
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Survey", "Dimatikan."));
    return { handled: true };
  }

  if (sub === "add" || sub === "tambah") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Survey", "Khusus owner."));
      return { handled: true };
    }
    const question = args.slice(2).join(" ").trim();
    if (!question) {
      await m.reply(claraWrap("Auto Survey", "Format: " + prefix + "autosurvey add <pertanyaan>\nContoh: " + prefix + "autosurvey add Rate aktivitas grup minggu ini 1-10"));
      return { handled: true };
    }
    cfg.surveys.push({ question, id: Date.now(), responses: {} });
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Survey", "Survey ditambah: " + question));
    return { handled: true };
  }

  if (sub === "send" || sub === "kirim") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Survey", "Khusus owner."));
      return { handled: true };
    }
    if (cfg.surveys.length === 0) {
      await m.reply(claraWrap("Auto Survey", "Belum ada survey. Ketik " + prefix + "autosurvey add <pertanyaan>."));
      return { handled: true };
    }
    const survey = cfg.surveys[cfg.surveys.length - 1];
    cfg.currentSurvey = survey.id;
    cfg.lastSent = Date.now();
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Survey Mingguan", [
      survey.question,
      "",
      "Ketik jawaban kamu: " + prefix + "autosurvey answer <jawaban>",
      "",
      "Survey berakhir 24 jam. Hasil dibagikan minggu depan.",
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "answer" || sub === "jawab") {
    if (!cfg.currentSurvey) {
      await m.reply(claraWrap("Auto Survey", "Tidak ada survey aktif."));
      return { handled: true };
    }
    const answer = args.slice(2).join(" ").trim();
    if (!answer) {
      await m.reply(claraWrap("Auto Survey", "Ketik jawaban: " + prefix + "autosurvey answer <jawaban>"));
      return { handled: true };
    }
    const survey = cfg.surveys.find(s => s.id === cfg.currentSurvey);
    if (!survey) {
      await m.reply(claraWrap("Auto Survey", "Survey tidak ditemukan."));
      return { handled: true };
    }
    if (!survey.responses) survey.responses = {};
    survey.responses[m.sender] = { answer, ts: Date.now() };
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Survey", "Jawaban tersimpan! Total: " + Object.keys(survey.responses).length));
    return { handled: true };
  }

  if (sub === "result" || sub === "hasil") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Survey", "Khusus owner."));
      return { handled: true };
    }
    if (cfg.surveys.length === 0) {
      await m.reply(claraWrap("Auto Survey", "Belum ada survey."));
      return { handled: true };
    }
    const survey = cfg.surveys[cfg.surveys.length - 1];
    const responses = Object.entries(survey.responses || {});
    if (responses.length === 0) {
      await m.reply(claraWrap("Auto Survey", "Belum ada respons."));
      return { handled: true };
    }
    const list = responses.map(([jid, r], i) => (i + 1) + ". @" + jid.split("@")[0] + ": " + r.answer).join("\n");
    await m.reply(claraWrap("Auto Survey Result", [
      "Pertanyaan: " + survey.question,
      "Total respons: " + responses.length,
      "",
      list,
    ].join("\n")), { mentions: responses.map(([jid]) => jid) });
    return { handled: true };
  }

  if (sub === "day" || sub === "hari") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Survey", "Khusus owner."));
      return { handled: true };
    }
    const day = parseInt(args[2] || "-1", 10);
    if (isNaN(day) || day < 0 || day > 6) {
      await m.reply(claraWrap("Auto Survey", "0=Minggu s/d 6=Sabtu"));
      return { handled: true };
    }
    cfg.day = day;
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Survey", "Hari diset: " + DAYS[day]));
    return { handled: true };
  }

  if (sub === "status" || sub === "cek" || !sub) {
    await m.reply(claraWrap("Auto Survey", [
      "Status: " + (cfg.enabled ? "AKTIF" : "MATI"),
      "Hari: " + DAYS[cfg.day],
      "Total survey: " + cfg.surveys.length,
      "Survey aktif: " + (cfg.currentSurvey ? "YA" : "TIDAK"),
    ].join("\n")));
    return { handled: true };
  }

  await m.reply(claraWrap("Auto Survey", [
    "AUTO SURVEY",
    "",
    prefix + "autosurvey on/off",
    prefix + "autosurvey add <pertanyaan>",
    prefix + "autosurvey send - kirim survey",
    prefix + "autosurvey answer <jawaban>",
    prefix + "autosurvey result - lihat hasil",
    prefix + "autosurvey day <0-6>",
    prefix + "autosurvey status",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler, getConfig, saveConfig };
