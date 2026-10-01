// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
//
// .keypatrol — AUTO KEY PATROL (27 Sep 2026, fitur automation no.1).
// Tiap 6 jam bot tes semua api key ke endpoint ringan provider. Key mati
// gak nunggu fitur error: DM owner SEGERA saat key mati / balik idup,
// laporan lengkap mingguan Minggu 08:00 WIB. Engine:
// src/lib/rara-key-patrol.js (jangan duplikasi logika di sini).

import { raraGuide } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import {
  ensureKeyPatrolState,
  buildStatusCard,
  buildReportCard,
  runKeyPatrol,
} from "../../src/lib/rara-key-patrol.js";

const pluginConfig = {
  name: "keypatrol",
  alias: ["keypatrol", "keyhealth", "apikeypatrol"],
  category: "owner",
  description: "Patrol otomatis semua api key tiap 6 jam — key mati dilaporkan segera, laporan mingguan ke DM",
  usage: ".keypatrol",
  example: ".keypatrol tes",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const st = ensureKeyPatrolState(db);
  const sub = (m.args?.[0] || "").toLowerCase();

  // tanpa argumen → status + guide
  if (!sub || sub === "status") {
    m.react?.(sub ? "🛠️" : "🧠");
    await m.reply(buildStatusCard(st));
    if (!sub) {
      await m.reply(raraGuide(
        "keypatrol",
        "Patrol otomatis semua api key tiap 6 jam.\n.keypatrol tes — tes semua key SEKARANG (live, hasil ditampilkan)\n.keypatrol lapor — laporan lengkap dari patrol terakhir\n.keypatrol on/off — nyalakan atau matikan patrol",
        ".keypatrol tes\n.keypatrol lapor",
        "Klasifikasi jujur: HIDUP (key lolos tes) · MATI (key ditolak provider, DM ke kamu segera saat terjadi) · RUSAK (server/jaringan bermasalah, gak dituduh mati) · Kosong (belum diisi). Laporan lengkap otomatis tiap Minggu 08:00 WIB."
      ));
    }
    return;
  }

  // ── TES: patrol langsung live ──
  if (sub === "tes" || sub === "test" || sub === "cek" || sub === "now") {
    m.react?.("🛠️");
    const { skipped, results } = await runKeyPatrol(sock);
    if (skipped) {
      return m.reply(raraGuide(
        "keypatrol",
        "Patrolnya lagi OFF — nyalakan dulu dengan .keypatrol on kalau mau tes.",
        ".keypatrol on",
        "Status patrol juga bisa dilihat dengan ketik .keypatrol status."
      ));
    }
    const mati = results.filter((r) => r.status === "mati");
    const note = mati.length
      ? `Ada ${mati.length} key yang ditolak provider — detail + link ganti key ada di kartu di atas. Laporan perubahan juga saya DM ke kamu.`
      : "Semua key yang terisi lolos tes. Kalau ada key yang nanti berubah status, saya DM kamu segera.";
    return m.reply(buildReportCard(results, Date.now()) + "\n\n" + note);
  }

  // ── LAPOR: laporan lengkap dari hasil patrol terakhir ──
  if (sub === "lapor" || sub === "laporan" || sub === "report") {
    m.react?.("🛠️");
    const last = Object.values(st.lastResults || {});
    if (!last.length) {
      return m.reply(raraGuide(
        "keypatrol",
        "Belum ada hasil patrol yang tercatat.\nKetik .keypatrol tes untuk menjalankan patrol pertama sekarang.",
        ".keypatrol tes",
        "Setelah patrol pertama jalan, laporan lengkap bakal tersedia di sini kapan saja."
      ));
    }
    return m.reply(buildReportCard(last, st.lastRun));
  }

  // ── ON ──
  if (sub === "on" || sub === "nyala" || sub === "aktif") {
    st.on = true;
    db.db.write();
    m.react?.("⚡");
    return m.reply(raraGuide(
      "keypatrol",
      "Patrol key saya nyalakan kembali.\nTiap 6 jam semua key yang terisi saya tes otomatis — kalau ada yang mati, saya DM kamu segera.",
      ".keypatrol tes",
      "Laporan lengkap tetap terkirim otomatis tiap Minggu 08:00 WIB."
    ));
  }

  // ── OFF ──
  if (sub === "off" || sub === "mati" || sub === "stop") {
    st.on = false;
    db.db.write();
    return m.reply(raraGuide(
      "keypatrol",
      "Oke, patrol key saya matikan.\nKey tetap terpakai seperti biasa — yang berhenti cuma pengecekan otomatis dan laporannya.",
      ".keypatrol on",
      "Kamu tetap bisa tes manual kapan saja dengan .keypatrol tes."
    ));
  }

  return m.reply(raraGuide(
    "keypatrol",
    "Sub perintahnya belum saya kenali. Yang tersedia: tes · lapor · status · on · off",
    ".keypatrol tes",
    "Ketik .keypatrol tanpa argumen untuk melihat status lengkapnya."
  ));
}

export { handler, pluginConfig, pluginConfig as config };
export default { handler, pluginConfig };
