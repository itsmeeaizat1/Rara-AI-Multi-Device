// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 DOCTOR — Self-Healing Bot (request owner 12 Sep 2026, ide fitur no 7)
// 🔹 AI baca stack trace error → tulis patch → syntax test → backup → apply.
// 🔹 DEFAULT OFF sejak pairing pertama — OWNER harus aktifin manual.
//   Yang bahaya (AI nulis kode) owner-gate, yang aman (cleanup, monitoring)
//   jalan otomatis selama doctor ON.
// ============================================================
import { raraWrap, raraError } from "../../src/lib/rara-menu-style.js";
import {
  getDoctorData, isDoctorOn, isDoctorAuto, setDoctorOn, setDoctorAuto,
  recordDoctorError, doctorScan, doctorClean, doctorHeal, initDoctorMonitor,
} from "../../src/lib/rara-doctor.js";

const pluginConfig = {
  name: "doctor",
  alias: ["doctor", "dokter", "selfheal", "healbot"],
  category: "bot",
  description: "Self-Healing Bot — AI benerin error bot sendiri (default OFF, owner only)",
  usage: ".doctor on/off\n.doctor status\n.doctor scan\n.doctor heal [no]\n.doctor auto on/off\n.doctor clean\n.doctor test",
  example: ".doctor on\n.doctor scan\n.doctor heal",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock, db } = {}) {
  const args = (m.args || []).map(String);
  const sub = (args[0] || "status").toLowerCase();

  // ── ON / OFF — aktifin manual (default pairing pertama OFF) ──
  if (sub === "on" || sub === "off") {
    const on = sub === "on";
    const now = setDoctorOn(db, on, m.sender);
    if (on) initDoctorMonitor(sock).catch(() => {});
    return m.reply(raraWrap("Doctor", on
      ? [`🩺 *SELF-HEALING BOT: AKTIF*`,
         `━━━━━━━━━━━━━━`,
         `▪ *Monitoring* — error kecatat + notif ke sini`,
         `▪ *Log cleanup* — jalan otomatis (aman)`,
         `▪ *Heal manual* — .doctor heal <no>`,
         `▪ *Auto heal* — OFF default, .doctor auto on buat nyalain`]
      : [`🩺 *SELF-HEALING BOT: MATI*`,
         `━━━━━━━━━━━━━━`,
         `*Yang bahaya + yang aman ikut mati semua*`]));
  }

  // ── AUTO — toggle auto-heal (opt-in eksplisit) ──
  if (sub === "auto") {
    const mode = (args[1] || "").toLowerCase();
    if (mode !== "on" && mode !== "off") {
      return m.reply(raraWrap("Doctor", [`❗ *Pemakaian: .doctor auto on/off*`,
        ``, `*Auto = AI langsung nulis + nerapin patch sendiri tiap error baru (tanpa nanya)*`, `*Syarat: .doctor on dulu*`]));
    }
    const res = setDoctorAuto(db, mode === "on");
    if (!res.ok) return m.reply(raraWrap("Doctor", [res.msg]));
    return m.reply(raraWrap("Doctor", res.auto
      ? [`🤖 *AUTO-HEAL: NYALA*`, `━━━━━━━━━━━━━━`, `*AI langsung benerin error baru sendiri* (patch → syntax test → backup → apply)`, `Notifikasi hasil tetap masuk ke sini`]
      : [`🤖 *AUTO-HEAL: MATI*`, `━━━━━━━━━━━━━━`, `*Error cuma dicatat + dinotifin* — perbaikan lewat *.doctor heal* manual`]));
  }

  // ── SCAN — laporan error tercatat ──
  if (sub === "scan") {
    const s = doctorScan(db);
    if (!s.total) return m.reply(raraWrap("Doctor", ["Belum ada error yang tercatat — bot sehat 🎉"]));
    const lines = [`🔍 *ERROR TERCATAT: ${s.total}* (on: ${s.on ? "iya" : "tidak"}, auto-heal: ${s.auto ? "iya" : "tidak"})`, `━━━━━━━━━━━━━━`];
    s.errors.slice(0, 8).forEach((e, i) => {
      lines.push(`▪ *No ${i + 1}*${e.healed ? " ✅healed" : ""} — ${e.message.slice(0, 70)}`);
      lines.push(e.file ? `▪ *Lokasi:* ${e.file}:${e.line} (${e.count}x)` : `▪ *Lokasi:* tanpa file repo (${e.count}x)`);
    });
    if (s.total > 8) lines.push(``, `+${s.total - 8} lainnya`);
    lines.push(``, `*Benerin: .doctor heal <no>*`);
    return m.reply(raraWrap("Doctor", lines));
  }

  // ── HEAL — AI tulis patch (owner-gate: cuma owner bisa nyuruh) ──
  if (sub === "heal") {
    if (!isDoctorOn(db)) return m.reply(raraWrap("Doctor", [`❗ *Doctor masih OFF*`, ``, `*.doctor on* dulu biar monitoring jalan`]));
    const idx = parseInt(args[1], 10);
    const s = doctorScan(db);
    if (!s.errors.length) return m.reply(raraWrap("Doctor", [`*Belum ada error yang tercatat — bot sehat 🎉*`]));
    const targetIdx = Number.isFinite(idx) && idx >= 1 ? idx - 1 : 0;
    if (targetIdx >= s.errors.length) return m.reply(raraWrap("Doctor", [`❗ *Nomor ${idx} gak ada — total cuma ${s.errors.length}*`, `Lihat daftar: *.doctor scan*`]));
    await m.react("🧠");
    const res = await doctorHeal(db, targetIdx);
    if (!res.ok) { await m.react("❌"); return m.reply(raraWrap("Doctor", [`❌ *Gagal heal*`, `━━━━━━━━━━━━━━`, res.msg])); }
    await m.react("🐣");
    return m.reply(raraWrap("Doctor", [
      `✅ *PATCH DITERAPKAN*`,
      `━━━━━━━━━━━━━━`,
      `▪ *File:* ${res.file}`,
      `▪ *Error:* ${res.message.slice(0, 60)}`,
      `▪ *Diagnosis:* ${res.reason}`,
      `▪ *Backup:* ${res.backupPath}`,
      ``,
      `⚙️ *Restart PM2 biar patch kepake*`,
    ]));
  }

  // ── CLEAN — bersihin log manual ──
  if (sub === "clean") {
    const res = doctorClean(db);
    return m.reply(raraWrap("Doctor", [`🧹 *LOG ERROR DIBERSIHIN*`, `━━━━━━━━━━━━━━`, `▪ *Dihapus:* ${res.removed} · *Sisa:* ${res.total}`]));
  }

  // ── TEST — injeksi error dummy buat tes alur ──
  if (sub === "test") {
    const e = new Error("dummy: doctor self-test — bukan error beneran");
    e.stack = `Error: dummy: doctor self-test — bukan error beneran\n    at Object.<anonymous> (${import.meta.url.replace("file://", "")}:1:1)`;
    recordDoctorError(db, "doctor-test", e);
    return m.reply(raraWrap("Doctor", [
      `🧪 *ERROR DUMMY DISUNTIK*`,
      `━━━━━━━━━━━━━━`,
      `▪ *Cek:* .doctor scan — bakal muncul paling atas`,
      `▪ *Alur record → dedup → scan udah jalan* ✅`,
    ]));
  }

  // ── STATUS (default) ──
  const d = getDoctorData(db);
  const fresh = d.errors.filter((e) => !e.healed).length;
  return m.reply(raraWrap("Doctor", [
    `🩺 *SELF-HEALING BOT*`,
    `━━━━━━━━━━━━━━`,
    `▪ *Status:* ${d.on ? "✅ ON" : "❌ OFF (default — owner aktifin manual)"}`,
    `▪ *Auto heal:* ${d.auto ? "ON" : "OFF"}`,
    `▪ *Error tercatat:* ${d.errors.length} (${fresh} belum diheal)`,
    ``,
    `📌 *PERINTAH*`,
    `━━━━━━━━━━━━━━`,
    `▪ .doctor on/off — aktifin/matikan`,
    `▪ .doctor scan — daftar error`,
    `▪ .doctor heal <no> — AI benerin error`,
    `▪ .doctor auto on/off — heal tanpa nanya`,
    `▪ .doctor clean / .doctor test`,
    ``,
    `ℹ *Yang aman jalan otomatis saat ON:* log cleanup 7 hari + monitoring notif`,
    `🔒 *Yang bahaya owner-gate:* AI nulis + nerapin kode`,
  ]));
}

export { pluginConfig as config, handler };
