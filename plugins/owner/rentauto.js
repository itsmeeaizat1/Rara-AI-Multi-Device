// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
//
// .rentauto — AUTO SEWA & PREMIUM MANAGER (27 Sep 2026, fitur automation
// no.2). Sewa & premium gak lagi "mati diam-diam": reminder H-3/H-1 ke
// penyewa, premium kedaluwarsa otomatis dibersihin, grup sewa kedaluwarsa
// diumuminin lalu bot keluar sendiri setelah grace period, digest harian
// ke DM owner. Engine: src/lib/rara-rent-auto.js (jangan duplikasi logika).

import { raraGuide } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import {
  ensureRentAutoState,
  buildRentAutoStatus,
  processRentAutoTick,
} from "../../src/lib/rara-rent-auto.js";

const pluginConfig = {
  name: "rentauto",
  alias: ["rentauto", "sewaauto", "autosewa", "autopremium"],
  category: "owner",
  description: "Manajer otomatis sewa & premium — reminder, pembersihan expired, keluar grup otomatis, digest harian",
  usage: ".rentauto",
  example: ".rentauto tes",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const st = ensureRentAutoState(db);
  const sub = (m.args?.[0] || "").toLowerCase();

  // tanpa argumen → status + guide
  if (!sub || sub === "status") {
    m.react?.(sub ? "🛠️" : "🧠");
    await m.reply(buildRentAutoStatus(db));
    if (!sub) {
      await m.reply(raraGuide(
        "rentauto",
        "Manajer otomatis untuk sewa & premium:\n.rentauto on/off — nyalakan atau matikan sistem\n.rentauto tes — jalankan satu putaran sekarang (lihat apa yang dikerjakan)\n.rentauto jam <HH:mm> — atur jam laporan harian ke DM kamu\n.rentauto grace <hari> — atur tenggang sebelum bot keluar dari grup kedaluwarsa (0-30)",
        ".rentauto tes\n.rentauto jam 20:30\n.rentauto grace 7",
        "Sistem jalan tiap 30 menit: reminder H-3 & H-1 dikirim ke penyewa, premium kedaluwarsa dibersihkan otomatis, grup sewa kedaluwarsa diumumkan lalu bot keluar sendiri setelah grace period. Semua kejadian dirangkum ke DM kamu sekali sehari."
      ));
    }
    return;
  }

  // ── ON ──
  if (sub === "on" || sub === "nyala" || sub === "aktif") {
    st.on = true;
    db.db.write();
    m.react?.("⚡");
    return m.reply(raraGuide(
      "rentauto",
      "Sistem sewa & premium otomatis saya nyalakan kembali.\nMulai putaran berikutnya, reminder, pembersihan, dan digest bakal jalan lagi.",
      ".rentauto tes",
      "Sistem memeriksa keadaan tiap 30 menit. Kalau ingin langsung dicek, ketik .rentauto tes."
    ));
  }

  // ── OFF ──
  if (sub === "off" || sub === "mati" || sub === "stop") {
    st.on = false;
    db.db.write();
    return m.reply(raraGuide(
      "rentauto",
      "Oke, sistem otomatisnya saya matikan.\nSewa & premium tetap berlaku seperti biasa — yang berhenti cuma pengingat, pembersihan otomatis, dan keluar grup otomatis.",
      ".rentauto on",
      "Data sewa, premium, dan catatan laporan kamu tetap saya simpan."
    ));
  }

  // ── TES: satu putaran langsung ──
  if (sub === "tes" || sub === "test" || sub === "cek" || sub === "now") {
    m.react?.("🛠️");
    const actions = await processRentAutoTick(sock);
    if (!actions.length) {
      return m.reply(raraGuide(
        "rentauto",
        "Sudah saya jalankan satu putaran penuh — belum ada yang perlu dikerjakan.\nArtinya: tidak ada sewa/premium yang mendekati habis, tidak ada yang kedaluwarsa hari ini.",
        ".rentauto status",
        "Puturan penuh memeriksa premium, semua grup sewa, dan laporan harian sekaligus."
      ));
    }
    const lines = actions.map((a) => `• ${a}`);
    return m.reply(raraGuide(
      "rentauto",
      `Selesai! Dalam satu putaran tadi saya mengerjakan ${actions.length} hal:\n${lines.join("\n")}`,
      ".rentauto status",
      "Detail setiap kejadian juga tercatat dan bakal masuk laporan harian ke DM kamu."
    ));
  }

  // ── JAM: atur jam digest harian ──
  if (sub === "jam") {
    const jam = (m.args?.[1] || "").trim();
    if (!/^\d{2}:\d{2}$/.test(jam)) {
      return m.reply("Format jam kurang tepat. Contoh yang benar: .rentauto jam 20:30");
    }
    const [hh, mm] = jam.split(":").map(Number);
    if (hh > 23 || mm > 59) {
      return m.reply("Jam melewati batas wajar. Format: HH:mm, contoh .rentauto jam 20:30");
    }
    st.digestJam = jam;
    st.lastDigestDate = ""; // biar hari yang sama bisa kirim ulang pakai jam baru
    db.db.write();
    return m.reply(raraGuide(
      "rentauto",
      `Siap! Mulai sekarang laporan harian bakal saya kirim ke DM kamu sekitar jam ${jam} WIB.`,
      ".rentauto tes",
      "Kalau hari ini laporan sudah pernah terkirim, laporan berikutnya efektif mulai besok."
    ));
  }

  // ── GRACE: tenggang sebelum bot keluar grup ──
  if (sub === "grace") {
    const hari = Number((m.args?.[1] || "").trim());
    if (!Number.isFinite(hari) || hari < 0 || hari > 30 || !Number.isInteger(hari)) {
      return m.reply("Jumlah hari kurang tepat. Contoh: .rentauto grace 7 (0-30 hari)");
    }
    st.graceDays = hari;
    db.db.write();
    return m.reply(raraGuide(
      "rentauto",
      `Siap! Grace period diatur jadi ${hari} hari.\nGrup yang sewanya kedaluwarsa diberi waktu ${hari} hari untuk perpanjang sebelum bot keluar otomatis.`,
      ".rentauto status",
      "Grace 0 hari berarti bot langsung keluar pada puturan pertama setelah sewa kedaluwarsa."
    ));
  }

  return m.reply(raraGuide(
    "rentauto",
    "Sub perintahnya belum saya kenali. Yang tersedia: on · off · status · tes · jam <HH:mm> · grace <hari>",
    ".rentauto tes",
    "Ketik .rentauto tanpa argumen untuk melihat status lengkapnya."
  ));
}

export { handler, pluginConfig, pluginConfig as config };
export default { handler, pluginConfig };
