// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "autoquote",
  alias: ["autoquote", "quoteotomatis", "quotesauto"],
  category: "future",
  description: "Auto broadcast quote/motivasi tiap pagi",
  usage: ".autoquote <command>",
  example: ".autoquote on 07:00",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const CATEGORIES = {
  motivasi: [
    "Jangan menunggu kesempatan. Ciptakan dia.",
    "Kesuksesan adalah jumlah dari usaha kecil yang diulang setiap hari.",
    "Gagal adalah bagian dari proses, bukan akhir dari perjalanan.",
    "Kamu tidak perlu sempurna untuk mulai, tapi kamu perlu mulai untuk jadi sempurna.",
    "Hari ini adalah hadiah. Itulah kenapa disebut present.",
    "Jangan bandingkan hari 1 kamu dengan hari 100 orang lain.",
    "Fokus pada progress, bukan perfection.",
    "Kerja keras mengalahkan bakat saat bakat tidak bekerja keras.",
  ],
  islam: [
    "Sesungguhnya bersama kesulitan ada kemudahan. (QS. Al-Insyirah: 6)",
    "Allumma inni audzubika minal hammi wal hazan.",
    "Siapa yang menempuh jalan untuk mencari ilmu, Allah akan permudah baginya jalan ke surga.",
    "Tidak ada yang dapat menolong kita kecuali Allah.",
    "Sabar itu ada dua macam: sabar atas sesuatu yang tidak kamu suka, dan sabar menahan diri dari sesuatu yang kamu inginkan.",
    "Hidup adalah ujian, mati adalah jaminan. Maka siapkan jawabanmu.",
  ],
  sukses: [
    "Disiplin adalah jembatan antara tujuan dan pencapaian.",
    "Orang sukses tidak berambisi untuk lebih baik dari orang lain, tapi lebih baik dari dirinya kemarin.",
    "Investasi terbaik adalah investasi pada diri sendiri.",
    "Mulailah dari apa yang kamu miliki, bukan dari apa yang kamu tunggu.",
    "Jadilah solusi, bukan bagian dari masalah.",
  ],
  cinta: [
    "Cinta sejati bukan menemukan orang sempurna, tapi melihat orang tidak sempurna dengan sempurna.",
    "Bahagia itu sederhana, ketika kita tahu kapan harus bersyukur.",
    "Diam bukan berarti tak peduli, kadang diam adalah bentuk kasih yang paling dewasa.",
  ],
  random: [],
};

CATEGORIES.random = [
  ...CATEGORIES.motivasi, ...CATEGORIES.islam, ...CATEGORIES.sukses, ...CATEGORIES.cinta,
];

function getConfig(db, gid) {
  const all = db.setting("autoquote") || {};
  if (!all[gid]) {
    all[gid] = { enabled: false, time: "07:00", category: "random", lastSent: 0, sentCount: 0 };
    db.setting("autoquote", all);
  }
  return all[gid];
}

function saveConfig(db, gid, data) {
  const all = db.setting("autoquote") || {};
  all[gid] = data;
  db.setting("autoquote", all);
  db.save();
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const cfg = getConfig(db, gid);

  if (sub === "on" || sub === "enable") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Quote", "Khusus owner."));
      return { handled: true };
    }
    const time = args[2] || cfg.time;
    if (!/^\d{2}:\d{2}$/.test(time)) {
      await m.reply(claraWrap("Auto Quote", "Format: " + prefix + "autoquote on <HH:MM>\nContoh: " + prefix + "autoquote on 07:00"));
      return { handled: true };
    }
    cfg.enabled = true;
    cfg.time = time;
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Quote", "AKTIF!\nJam: " + time + "\nKategori: " + cfg.category + "\nBot akan kirim quote tiap hari."));
    return { handled: true };
  }

  if (sub === "off" || sub === "disable") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Quote", "Khusus owner."));
      return { handled: true };
    }
    cfg.enabled = false;
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Quote", "Dimatikan."));
    return { handled: true };
  }

  if (sub === "category" || sub === "kategori") {
    if (!m.isOwner) {
      await m.reply(claraWrap("Auto Quote", "Khusus owner."));
      return { handled: true };
    }
    const cat = (args[2] || "").toLowerCase();
    if (!CATEGORIES[cat]) {
      await m.reply(claraWrap("Auto Quote", "Kategori: " + Object.keys(CATEGORIES).join(", ")));
      return { handled: true };
    }
    cfg.category = cat;
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Auto Quote", "Kategori diset: " + cat));
    return { handled: true };
  }

  if (sub === "now" || sub === "kirim") {
    const quotes = CATEGORIES[cfg.category] || CATEGORIES.random;
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    cfg.lastSent = Date.now();
    cfg.sentCount++;
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Quote Harian", quote + "\n\n_Kategori: " + cfg.category + "_"));
    return { handled: true };
  }

  if (sub === "status" || sub === "cek" || !sub) {
    await m.reply(claraWrap("Auto Quote", [
      "Status: " + (cfg.enabled ? "AKTIF" : "MATI"),
      "Jam: " + cfg.time,
      "Kategori: " + cfg.category,
      "Total terkirim: " + cfg.sentCount,
      "Terakhir: " + (cfg.lastSent ? new Date(cfg.lastSent).toLocaleString("id-ID") : "belum pernah"),
      "",
      "Kategori tersedia: " + Object.keys(CATEGORIES).join(", "),
    ].join("\n")));
    return { handled: true };
  }

  await m.reply(claraWrap("Auto Quote", [
    "AUTO QUOTE",
    "",
    prefix + "autoquote on <HH:MM>",
    prefix + "autoquote off",
    prefix + "autoquote category <kategori>",
    prefix + "autoquote now - kirim sekarang",
    prefix + "autoquote status",
    "",
    "Kategori: motivasi, islam, sukses, cinta, random",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler, getConfig, saveConfig, CATEGORIES };
