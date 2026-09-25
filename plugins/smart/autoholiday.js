// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "autoholiday",
  alias: ["autoholiday"],
  category: "smart",
  description: "Auto greeting hari besar nasional & agama",
  usage: ".autoholiday <command>",
  example: ".autoholiday on",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const HOLIDAYS = [
  { date: "01-01", name: "Tahun Baru", greeting: "Selamat Tahun Baru! Semoga tahun ini membawa keberkahan dan kebahagiaan untuk kita semua." },
  { date: "01-17", name: "Hari Kemerdekaan RI", greeting: "Dirgahayu Republik Indonesia! Merdeka!" },
  { date: "02-04", name: "Hari Lahir Pancasila", greeting: "Selamat Hari Lahir Pancasila. Mari kita jaga nilai-nilai Pancasila." },
  { date: "03-08", name: "Hari Perempuan Internasional", greeting: "Selamat Hari Perempuan Internasional untuk semua wanita hebat di grup ini." },
  { date: "05-01", name: "Hari Buruh Internasional", greeting: "Selamat Hari Buruh! Hormat untuk semua pekerja." },
  { date: "05-02", name: "Hari Pendidikan Nasional", greeting: "Selamat Hari Pendidikan Nasional! Pendidikan adalah kunci masa depan." },
  { date: "06-01", name: "Hari Lahir Pancasila", greeting: "Selamat Hari Lahir Pancasila." },
  { date: "07-22", name: "Hari Kebangkitan Nasional", greeting: "Selamat Hari Kebangkitan Nasional! Mari kita bangkit bersama." },
  { date: "08-17", name: "Hari Kemerdekaan RI", greeting: "Dirgahayu HUT Republik Indonesia ke-81! Merdeka! Selamat 17 Agustus!" },
  { date: "10-01", name: "Hari Kesaktian Pancasila", greeting: "Selamat Hari Kesaktian Pancasila." },
  { date: "10-02", name: "Hari Batik Nasional", greeting: "Selamat Hari Batik Nasional! Bangga pakai batik." },
  { date: "10-28", name: "Sumpah Pemuda", greeting: "Selamat Hari Sumpah Pemuda! Sedikit bercakap banyak berbuat." },
  { date: "11-10", name: "Hari Pahlawan", greeting: "Selamat Hari Pahlawan. Mengenang jasa para pahlawan." },
  { date: "12-22", name: "Hari Ibu", greeting: "Selamat Hari Ibu! Untuk semua ibu, terima kasih atas cinta tak bersyarat." },
  { date: "12-25", name: "Hari Raya Natal", greeting: "Selamat Hari Raya Natal! Damai dan bahagia untuk semua." },
];

const ISLAMIC_HOLIDAYS = [
  { name: "Idul Fitri", greeting: "Taqraballah minna wa minkum. Selamat Hari Raya Idul Fitri! Mohon maaf lahir dan batin." },
  { name: "Idul Adha", greeting: "Selamat Hari Raya Idul Adha. Semoga qurban kita diterima." },
  { name: "Maulid Nabi", greeting: "Selamat Maulid Nabi Muhammad SAW. Mari kita teladani akhlaknya." },
  { name: "Isra Miraj", greeting: "Selamat Hari Isra Miraj. Semoga shalat kita diterima." },
  { name: "Tahun Baru Hijriyah", greeting: "Selamat Tahun Baru Hijriyah. Semoga tahun ini penuh berkah." },
];

function getConfig(db, gid) {
  const all = db.setting("autoholiday") || {};
  if (!all[gid]) {
    all[gid] = { enabled: false, lastHoliday: "", lastSent: 0, includeIslamic: true };
    db.setting("autoholiday", all);
  }
  return all[gid];
}

function saveConfig(db, gid, data) {
  const all = db.setting("autoholiday") || {};
  all[gid] = data;
  db.setting("autoholiday", all);
  db.save();
}

function todayStr() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return mm + "-" + dd;
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const cfg = getConfig(db, gid);

  if (sub === "on" || sub === "enable") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Holiday", "Khusus owner."));
      return { handled: true };
    }
    cfg.enabled = true;
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Holiday", "AKTIF!\nBot akan kirim ucapan otomatis di hari besar.\nIslamic: " + (cfg.includeIslamic ? "ON" : "OFF")));
    return { handled: true };
  }

  if (sub === "off" || sub === "disable") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Holiday", "Khusus owner."));
      return { handled: true };
    }
    cfg.enabled = false;
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Holiday", "Dimatikan."));
    return { handled: true };
  }

  if (sub === "islamic" || sub === "islami") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Holiday", "Khusus owner."));
      return { handled: true };
    }
    cfg.includeIslamic = !cfg.includeIslamic;
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Holiday", "Islamic holidays: " + (cfg.includeIslamic ? "ON" : "OFF")));
    return { handled: true };
  }

  if (sub === "list" || sub === "cek" || !sub) {
    const today = todayStr();
    const todayHoliday = HOLIDAYS.find(h => h.date === today);
    const list = HOLIDAYS.map(h => h.date + " - " + h.name + (h.date === today ? " (HARI INI)" : "")).join("\n");
    await m.reply(claraWrap("Auto Holiday", [
      "Status: " + (cfg.enabled ? "AKTIF" : "MATI"),
      "Islamic: " + (cfg.includeIslamic ? "ON" : "OFF"),
      "",
      "Daftar hari besar:",
      list,
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "today" || sub === "hariini") {
    const today = todayStr();
    const holiday = HOLIDAYS.find(h => h.date === today);
    if (holiday) {
      await m.reply(claraWrap(holiday.name, holiday.greeting));
    } else {
      await m.reply(claraWrap("Auto Holiday", "Hari ini bukan hari besar."));
    }
    return { handled: true };
  }

  if (sub === "test") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Holiday", "Khusus owner."));
      return { handled: true };
    }
    const sample = HOLIDAYS[0];
    await m.reply(claraWrap(sample.name, sample.greeting + "\n\n_(test preview)_"));
    return { handled: true };
  }

  await m.reply(claraWrap("Auto Holiday", [
    "AUTO HOLIDAY GREETING",
    "",
    prefix + "autoholiday on/off",
    prefix + "autoholiday islamic - toggle islamic holidays",
    prefix + "autoholiday list - daftar hari besar",
    prefix + "autoholiday today - cek hari ini",
    prefix + "autoholiday test - preview",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler, getConfig, saveConfig, HOLIDAYS, ISLAMIC_HOLIDAYS };
