// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// grading.js — Beri penilaian bot (rating bintang) via popup tombol
// Request owner 19 Sep 2026: "di tmbol menu support tmbah menu beri penilaian
// pas diklik pilihan puas kyk bot org ini" — row "Beri Penilaian" ada di
// popup tombol Support menu card (nova-menu-card.js supportRows), diklik →
// popup pilihan rating ala bot populer (⭐⭐⭐⭐⭐ Puas Banget dst).
// Rating tersimpan db.data.penilaian + notif DM ke owner (pola feedback.js).
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { toSC } from "../../src/lib/styler.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "penilaian",
  alias: ["penilaian", "rating", "rate", "nilaibot"],
  category: "info",
  description: "Beri penilaian bintang buat bot — popup pilihan Puas sampai Kecewa",
  usage: ".penilaian",
  example: ".penilaian",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// 5 pilihan rating — label skala "sangat buruk sampai sangat baik"
// (revisi owner 20 Sep 2026 — disamain sama popup tombol nav Beri Penilaian
// di menu card; alias lama "puas banget"/"kecewa" masih kebaca parseRating)
const RATING_OPTIONS = [
  { value: 5, label: "Sangat Baik", stars: "⭐⭐⭐⭐⭐", description: "Layanan bot luar biasa, keep it up!" },
  { value: 4, label: "Baik", stars: "⭐⭐⭐⭐", description: "Bot nyaman dan enak dipakai" },
  { value: 3, label: "Cukup", stars: "⭐⭐⭐", description: "Biasa aja, masih bisa lebih baik" },
  { value: 2, label: "Buruk", stars: "⭐⭐", description: "Banyak yang perlu dibenerin" },
  { value: 1, label: "Sangat Buruk", stars: "⭐", description: "Pengalaman pakai yang jelek" },
];

// ambil rating dari teks — dukung angka (".penilaian 5", ".penilaian 5 bintang")
// + label santai (".penilaian puas banget", "kurang", "kecewa") — biar user
// yang ngetik manual tanpa popup juga ke-handle
function parseRating(raw) {
  const t = String(raw || "").toLowerCase().trim();
  if (!t) return null;
  const mNum = t.match(/(?:^|\s)([1-5])(?:\s*(?:bintang|star|x))?/);
  if (mNum) return parseInt(mNum[1], 10);
  if (/sangat\s*baik|puas\s*banget|mantap|keren\s*banget|bagus\s*banget/.test(t)) return 5;
  if (/sangat\s*buruk/.test(t)) return 1;
  if (/baik|puas|bagus|keren/.test(t)) return 4;
  if (/cukup|lumayan|biasa/.test(t)) return 3;
  if (/buruk|kurang/.test(t)) return 2;
  if (/kecewa|jelek/.test(t)) return 1;
  return null;
}

// statistik rating dari db (dipakai body popup + reply terima kasih + stats)
function ratingStats(db) {
  const list = Array.isArray(db.data.penilaian) ? db.data.penilaian : [];
  if (!list.length) return { total: 0, avg: 0, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, list };
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;
  for (const r of list) {
    const v = Math.min(5, Math.max(1, parseInt(r.rating, 10) || 0));
    if (!v) continue;
    breakdown[v]++;
    sum += v;
  }
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { total, avg: total ? sum / total : 0, breakdown, list };
}

// ── kartu popup rating (interactiveMessage + nativeFlow, pola payment.js) ──
async function sendRatingCard(m, sock, botConfig) {
  const db = getDatabase();
  const botName = botConfig.bot?.name || "Nova AI";
  const prefix = botConfig.command?.prefix || ".";
  const { total, avg, breakdown } = ratingStats(db);

  const statsLines = total
    ? [
        `📊 Rata-rata: *${avg.toFixed(1)}/5* dari ${total} penilai`,
        `⭐ 5: ${breakdown[5]} · 4: ${breakdown[4]} · 3: ${breakdown[3]} · 2: ${breakdown[2]} · 1: ${breakdown[1]}`,
      ]
    : ["📊 Belum ada yang kasih penilaian — jadi yang pertama!"];

  const body = claraWrap("Beri Penilaian Bot", [
    `Sampaikan pengalaman kamu pakai *${botName}* ${botConfig.bot?.version ? `v${botConfig.bot.version}` : ""}`.trim(),
    "",
    "Tap tombol *⭐ Beri Penilaian* lalu pilih yang paling pas:",
    "",
    ...statsLines,
    "",
    "Penilaian kamu sangat berarti buat perkembangan bot 🙏",
  ]);

  const rows = RATING_OPTIONS.map((o) => ({
    title: `${o.stars} ${o.label}`,
    description: o.description,
    id: `${prefix}penilaian ${o.value}`,
  }));

  // trik Elaina V3: 2 placeholder unlock duluan biar WA mau render tombol
  const buttons = [
    { name: "single_select", buttonParamsJson: JSON.stringify({ has_multiple_buttons: true }) },
    { name: "call_permission_request", buttonParamsJson: JSON.stringify({ has_multiple_buttons: true }) },
    {
      name: "single_select",
      buttonParamsJson: JSON.stringify({
        title: "⭐ Pilih Penilaian",
        sections: [{ title: "Penilaian Kamu", rows }],
      }),
    },
  ];

  await sock.sendMessage(m.chat, {
    interactiveMessage: {
      body: { text: body },
      footer: { text: toSC(`${botName} — Rating Bot`) },
      header: { title: "", hasMediaAttachment: false },
      nativeFlowMessage: { buttons },
    },
  });
  return true;
}

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    const raw = String(m.text || "").trim();

    // ── .penilaian stats — ringkasan penilaian (siapa pun boleh lihat) ──
    if (/^\.?(penilaian|rating|rate|nilaibot)\s+(stats?|statistik|hasil)$/i.test(raw)) {
      const { total, avg, breakdown, list } = ratingStats(getDatabase());
      if (!total) {
        return m.reply(claraWrap("Statistik Penilaian", ["Belum ada penilaian masuk.", "", `Ajak teman kasih nilai lewat *${prefix}penilaian* 🙏`]));
      }
      const bar = (n) => "█".repeat(Math.max(1, Math.round((n / total) * 10))) + "░".repeat(10 - Math.max(1, Math.round((n / total) * 10)));
      return m.reply(claraWrap("Statistik Penilaian", [
        `⭐ Rata-rata: *${avg.toFixed(1)}/5* (${total} penilai)`,
        "",
        `⭐⭐⭐⭐⭐  ${String(breakdown[5]).padStart(3)}  ${bar(breakdown[5])}`,
        `⭐⭐⭐⭐    ${String(breakdown[4]).padStart(3)}  ${bar(breakdown[4])}`,
        `⭐⭐⭐      ${String(breakdown[3]).padStart(3)}  ${bar(breakdown[3])}`,
        `⭐⭐        ${String(breakdown[2]).padStart(3)}  ${bar(breakdown[2])}`,
        `⭐          ${String(breakdown[1]).padStart(3)}  ${bar(breakdown[1])}`,
        "",
        `Penilaian terakhir: ${new Date(list[list.length - 1].createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" })}`,
      ]));
    }

    const value = parseRating(raw);

    // ── belum ada rating → kirimi kartu popup pilihan ──
    if (!value) {
      await sendRatingCard(m, sock, botConfig);
      return { handled: true };
    }

    // ── rating valid → simpan + makasih + notif owner ──
    const opt = RATING_OPTIONS.find((o) => o.value === value) || RATING_OPTIONS[0];
    const db = getDatabase();
    if (!db.data.penilaian) db.data.penilaian = [];
    db.data.penilaian.push({
      from: m.sender,
      fromName: m.pushName || "Unknown",
      chat: m.chat,
      chatName: m.chatName || (m.isGroup ? "Unknown Group" : "Private Chat"),
      rating: value,
      label: opt.label,
      createdAt: Date.now(),
    });
    await db.save(); // persist (pola db.data + save)

    const { total, avg } = ratingStats(db);

    // notif DM ke owner (pola feedback.js)
    const ownerNumbers = botConfig.owner?.number || [];
    let ownerNotified = false;
    const senderName = m.pushName || "Unknown";
    const senderNum = m.sender?.split("@")[0] || "Unknown";
    for (const ownerNum of ownerNumbers) {
      const ownerJid = `${String(ownerNum).replace(/[^0-9]/g, "")}@s.whatsapp.net`;
      if (!/^\d+@s\.whatsapp\.net$/.test(ownerJid)) continue;
      const time = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" });
      try {
        await sock.sendMessage(ownerJid, { text: claraWrap("Penilaian Masuk", [
          `Penilaian: *${opt.stars} ${opt.label}* (${value}/5)`,
          "",
          `Dari: ${senderName} (${senderNum})`,
          `Chat: ${m.chatName || (m.isGroup ? "Unknown Group" : "Private Chat")}`,
          `Waktu: ${time}`,
          "",
          `📊 Rata-rata sekarang: *${avg.toFixed(1)}/5* (${total} penilai)`,
        ]) });
        ownerNotified = true;
      } catch (e) {
        console.error("[penilaian] Gagal kirim ke owner (" + ownerJid + "):", e.message);
        continue;
      }
    }

    await m.reply(claraWrap("Terima Kasih! 🙏", [
      `Penilaian kamu: *${opt.stars} ${opt.label}*`,
      "",
      `📊 Rata-rata bot sekarang: *${avg.toFixed(1)}/5* dari ${total} penilai`,
      ownerNotified ? "Owner udah dapet notifikasi penilaian kamu ✅" : "",
      "",
      `Mau kasih saran juga? Ketik *${prefix}masukan <pesan>*`,
    ].filter(Boolean)));
    return { handled: true };
  } catch (error) {
    console.error("[penilaian] error:", error.message);
    return m.reply(te(m.prefix, m.command, m.pushName), "penilaian");
  }
}

export { pluginConfig as config, handler };
