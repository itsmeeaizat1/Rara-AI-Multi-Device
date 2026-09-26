// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 DOCTOR — Self-Healing Bot (request owner 12 Sep 2026, ide fitur no 7)
// 🔹 AI baca stack trace error → tulis patch → syntax test → backup → apply.
// 🔹 DEFAULT OFF sejak pairing pertama — OWNER harus aktifin manual.
//   Yang bahaya (AI nulis kode) owner-gate, yang aman (cleanup, monitoring)
//   jalan otomatis selama doctor ON.
// ============================================================
import { claraWrap, novaError } from "../../src/lib/nova-menu-style.js";
import { smallcapsText } from "../../src/lib/styler.js";
import {
  getDoctorData, isDoctorOn, isDoctorAuto, setDoctorOn, setDoctorAuto,
  recordDoctorError, doctorScan, doctorClean, doctorHeal, initDoctorMonitor,
} from "../../src/lib/nova-doctor.js";

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
    return m.reply(claraWrap("Doctor", on
      ? [`🩺 Self-Healing Bot ${smallcapsText("AKTIF")}`,
         ``,
         `${smallcapsText("monitoring")} — error kecatat + notif ke sini`,
         `${smallcapsText("log cleanup")} — jalan otomatis (aman)`,
         `${smallcapsText("heal manual")} — .doctor heal <no>`,
         `${smallcapsText("auto heal")} — OFF default, .doctor auto on buat nyalain`]
      : ["🩺 Self-Healing Bot dimatiin", `Yang bahaya + yang aman ikut mati semua`]));
  }

  // ── AUTO — toggle auto-heal (opt-in eksplisit) ──
  if (sub === "auto") {
    const mode = (args[1] || "").toLowerCase();
    if (mode !== "on" && mode !== "off") {
      return m.reply(claraWrap("Doctor", [`${smallcapsText("pemakaian")}: .doctor auto on/off`,
        ``, `auto = AI langsung nulis + nerapin patch sendiri tiap error baru (tanpa nanya)`, `syarat: .doctor on dulu`]));
    }
    const res = setDoctorAuto(db, mode === "on");
    if (!res.ok) return m.reply(claraWrap("Doctor", [res.msg]));
    return m.reply(claraWrap("Doctor", res.auto
      ? ["🤖 Auto-heal NYALA", ``, `AI langsung benerin error baru sendiri (patch → syntax test → backup → apply)`, `Notifikasi hasil tetap masuk ke sini`]
      : ["🤖 Auto-heal mati", ``, `Error cuma dicatat + dinotifin — perbaikan lewat .doctor heal manual`]));
  }

  // ── SCAN — laporan error tercatat ──
  if (sub === "scan") {
    const s = doctorScan(db);
    if (!s.total) return m.reply(claraWrap("Doctor", ["Belum ada error yang tercatat — bot sehat 🎉"]));
    const lines = [`${smallcapsText("error tercatat")}: ${s.total} (on: ${s.on ? "iya" : "tidak"}, auto-heal: ${s.auto ? "iya" : "tidak"})`, ``];
    s.errors.slice(0, 8).forEach((e, i) => {
      lines.push(`𝗡𝗼 ${i + 1}${e.healed ? " ✅healed" : ""} — ${e.message.slice(0, 70)}`);
      if (e.file) lines.push(`   ↳ ${e.file}:${e.line} (${e.count}x)`);
      else lines.push(`   ↳ ${smallcapsText("tanpa file repo")} (${e.count}x)`);
    });
    if (s.total > 8) lines.push(``, `+${s.total - 8} lainnya`);
    lines.push(``, `${smallcapsText("benerin")}: .doctor heal <no>`);
    return m.reply(claraWrap("Doctor", lines));
  }

  // ── HEAL — AI tulis patch (owner-gate: cuma owner bisa nyuruh) ──
  if (sub === "heal") {
    if (!isDoctorOn(db)) return m.reply(claraWrap("Doctor", ["Doctor masih OFF", ``, `.doctor on dulu biar monitoring jalan`]));
    const idx = parseInt(args[1], 10);
    const s = doctorScan(db);
    if (!s.errors.length) return m.reply(claraWrap("Doctor", ["Belum ada error yang tercatat"]));
    const targetIdx = Number.isFinite(idx) && idx >= 1 ? idx - 1 : 0;
    if (targetIdx >= s.errors.length) return m.reply(claraWrap("Doctor", [`Nomor ${idx} gak ada — total cuma ${s.errors.length}`, `Lihat daftar: .doctor scan`]));
    await m.react("🧠");
    const res = await doctorHeal(db, targetIdx);
    if (!res.ok) { await m.react("❌"); return m.reply(claraWrap("Doctor", [`${smallcapsText("gagal heal")}`, ``, res.msg])); }
    await m.react("🐣");
    return m.reply(claraWrap("Doctor", [
      `✅ ${smallcapsText("patch diterapkan")}`,
      ``,
      `${smallcapsText("file")}: ${res.file}`,
      `${smallcapsText("error")}: ${res.message.slice(0, 60)}`,
      `${smallcapsText("diagnosis")}: ${res.reason}`,
      ``,
      `${smallcapsText("backup")}: ${res.backupPath}`,
      ``,
      `⚙️ restart PM2 biar patch kepake`,
    ]));
  }

  // ── CLEAN — bersihin log manual ──
  if (sub === "clean") {
    const res = doctorClean(db);
    return m.reply(claraWrap("Doctor", [`${smallcapsText("log error dibersihin")}`, ``, `Dihapus: ${res.removed} • Sisa: ${res.total}`]));
  }

  // ── TEST — injeksi error dummy buat tes alur ──
  if (sub === "test") {
    const e = new Error("dummy: doctor self-test — bukan error beneran");
    e.stack = `Error: dummy: doctor self-test — bukan error beneran\n    at Object.<anonymous> (${import.meta.url.replace("file://", "")}:1:1)`;
    recordDoctorError(db, "doctor-test", e);
    return m.reply(claraWrap("Doctor", [
      `🧪 ${smallcapsText("error dummy disuntik")}`,
      ``,
      `Cek: .doctor scan — bakal muncul paling atas`,
      `Alur record → dedup → scan udah jalan ✅`,
    ]));
  }

  // ── STATUS (default) ──
  const d = getDoctorData(db);
  const fresh = d.errors.filter((e) => !e.healed).length;
  return m.reply(claraWrap("Doctor", [
    `🩺 ${smallcapsText("self-healing bot")}`,
    ``,
    `${smallcapsText("status")}: ${d.on ? "ON" : "OFF (default — owner aktifin manual)"}`,
    `${smallcapsText("auto heal")}: ${d.auto ? "ON" : "OFF"}`,
    `${smallcapsText("error tercatat")}: ${d.errors.length} (${fresh} belum diheal)`,
    ``,
    `${smallcapsText("perintah")}:`,
    `• .doctor on/off — aktifin/matikan`,
    `• .doctor scan — daftar error`,
    `• .doctor heal <no> — AI benerin error`,
    `• .doctor auto on/off — heal tanpa nanya`,
    `• .doctor clean / .doctor test`,
    ``,
    `${smallcapsText("yang aman jalan otomatis saat ON")}: log cleanup 7 hari + monitoring notif`,
    `${smallcapsText("yang bahaya owner-gate")}: AI nulis + nerapin kode`,
  ]));
}

export { pluginConfig as config, handler };
