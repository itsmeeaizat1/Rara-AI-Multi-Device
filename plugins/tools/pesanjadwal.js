// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 Pesan Terjadwal — .pesanjadwal
// 🔹 Jadwalin pesan di WAKTU ABSOLUT (bukan durasi seperti .remind):
//   jam ("19:30"), "besok 07:00", "lusa 07:00", tanggal ("25-12 08:00",
//   "25-12-2026 07:30") — sampai 1 tahun ke depan.
// 🔹 Gap: .remind cuma durasi relatif max 7 hari; .schedule owner-only
//   repeat harian. Ini personal one-shot semua user.
// 🔹 REUSE engine nova-reminder-engine (persist + restore pas restart +
//   missed handling) — kind:"pesanjadwal" bikin kartu bunyi sendiri.
// 🔹 Live countdown 🕒 standar — del → closing adaptif DIBATALKAN.
// ═════════════════════════════════════════════

import moment from "moment-timezone";
import {
  armReminder,
  persistReminders,
  cancelReminder,
  listActiveReminders,
} from "../../src/lib/nova-reminder-engine.js";
import { runLiveTicker } from "../../src/lib/nova-countdown.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const TZ = "Asia/Jakarta";

const pluginConfig = {
  name: "pesanjadwal",
  alias: ["pesanjadwal", "pesanterjadwal", "jadwalpesan"],
  category: "tools",
  description: "Pesan terjadwal waktu absolut — besok 07:00, 25-12 08:00, sampai 1 tahun",
  usage: ".pesanjadwal <waktu> | <pesan> — list/del/status",
  example: ".pesanjadwal besok 07:00 | jangan lupa rapat pagi",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

// ── parser waktu absolut → epoch ms (WIB). null kalau gak dikenali ──
// Format: HH:MM | besok HH:MM | lusa HH:MM | DD-MM[-YYYY] [HH:MM] | dalam <durasi>
export function parseWhen(str) {
  const s = String(str || "").trim().toLowerCase();
  if (!s) return null;
  const nowWib = moment.tz(TZ);

  // dalam <durasi> — relatif (bonus compat)
  const mRel = s.match(/^dalam\s+(\d+)\s*(m|menit|h|jam|d|hari)\b/);
  if (mRel) {
    const n = parseInt(mRel[1]);
    const unit = mRel[2];
    const ms =
      (unit === "m" || unit === "menit") ? n * 60000 :
      (unit === "h" || unit === "jam") ? n * 3600000 :
      n * 86400000;
    return Date.now() + ms;
  }

  // besok/lusa [HH:MM]
  const mBesok = s.match(/^(besok|lusa)\s+(\d{1,2})[:.](\d{2})$/);
  if (mBesok) {
    const add = mBesok[1] === "lusa" ? 2 : 1;
    return moment.tz(TZ)
      .add(add, "days")
      .hour(+mBesok[2]).minute(+mBesok[3]).second(0).millisecond(0)
      .valueOf();
  }

  // tanggal DD-MM[-YYYY] [HH:MM]
  const mDate = s.match(/^(\d{1,2})-(\d{1,2})(?:-(\d{4}))?(?:\s+(\d{1,2})[:.](\d{2}))?$/);
  if (mDate) {
    const d = +mDate[1], mo = +mDate[2] - 1;
    const y = mDate[3] ? +mDate[3] : nowWib.year();
    const h = mDate[4] !== undefined ? +mDate[4] : 8; // default jam 08:00
    const mi = mDate[5] !== undefined ? +mDate[5] : 0;
    if (mo < 0 || mo > 11 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
    const mt = moment.tz(TZ).year(y).month(mo).date(d).hour(h).minute(mi).second(0).millisecond(0);
    if (!mt.isValid() || mt.date() !== d) return null; // 31-2 → invalid
    return mt.valueOf();
  }

  // HH:MM hari ini (lewat → besok)
  const mTime = s.match(/^(\d{1,2})[:.](\d{2})$/);
  if (mTime) {
    const h = +mTime[1], mi = +mTime[2];
    if (h > 23 || mi > 59) return null;
    const mt = moment.tz(TZ).hour(h).minute(mi).second(0).millisecond(0);
    if (mt.valueOf() <= Date.now()) mt.add(1, "days");
    return mt.valueOf();
  }

  return null;
}

// ── format ETA WIB — "📅 Kam, 25 Des 08:00 WIB" ──
export function formatWib(ts) {
  return moment.tz(Number(ts), TZ).format("ddd, DD MMM YYYY HH:mm") + " WIB";
}

function formatRemaining(ms) {
  if (ms <= 0) return "sekarang";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const mnt = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d} hari ${h} jam`;
  if (h > 0) return `${h} jam ${mnt} menit`;
  if (mnt > 0) return `${mnt} menit ${sec} dtk`;
  return `${sec} dtk`;
}

function genId() {
  return "PJD-" + Math.random().toString(36).substring(2, 6).toUpperCase();
}

async function handler(m, { sock }) {
  try {
    const args = (m.args || []);
    const raw = (m.text || "").trim();
    const sender = m.sender || m.key?.participant || "";
    const chatId = m.key?.remoteJid || sender;
    const sub = (args[0] || "").toLowerCase();
    const MAX = 10; // max pesan terjadwal aktif per user

    // ═══ GUIDE ═══
    if (!sub || ["help", "bantuan"].includes(sub)) {
      return m.reply(claraWrap("Pesan Terjadwal", [
        "📋 *PESAN TERJADWAL — WAKTU ABSOLUT*",
        "",
        "Jadwalin pesan di jam/tanggal pasti — bot kirim tepat waktu, tahan restart.",
        "",
        "• *.pesanjadwal 19:30 | <pesan>* — hari ini (lewat → besok)",
        "• *.pesanjadwal besok 07:00 | <pesan>*",
        "• *.pesanjadwal lusa 07:00 | <pesan>*",
        "• *.pesanjadwal 25-12 08:00 | <pesan>* — tanggal (default jam 8)",
        "• *.pesanjadwal 25-12-2026 07:30 | <pesan>* — lengkap",
        "• *.pesanjadwal dalam 2 jam | <pesan>* — relatif bonus",
        "",
        "• *.pesanjadwal list* — daftar pesan terjadwal kamu",
        "• *.pesanjadwal del <id>* — batalkan",
        "• *.pesanjadwal status*",
        "",
        "💡 Max 10 aktif, jangkauan 1 tahun. Waktu ikut WIB.",
        "Untuk durasi pendek (30m/2h) tetep pakai *.remind*",
      ]));
    }

    // ═══ LIST ═══
    if (["list", "daftar"].includes(sub)) {
      const mine = listActiveReminders(sender).filter((r) => r.kind === "pesanjadwal");
      if (!mine.length) {
        return m.reply(claraWrap("Pesan Terjadwal", "Kamu gak punya pesan terjadwal aktif!\n\nKetik *.pesanjadwal help* untuk cara buat", "info"));
      }
      const lines = mine.map((r, i) => {
        const sisa = Number(r.fireAt) - Date.now();
        const tag = sisa <= 0 ? "🔴" : sisa <= 86400000 ? "🕒" : "📅";
        return `${i + 1}. ${tag} ${r.id}\n   Pesan: ${r.message}\n   Kirim: ${formatWib(r.fireAt)} (${formatRemaining(sisa)} lagi)`;
      });
      return m.reply(claraWrap(`Pesan Terjadwal Aktif (${mine.length})`, lines));
    }

    // ═══ DEL ═══
    if (["del", "hapus", "cancel", "batal"].includes(sub)) {
      const id = (args[1] || "").toUpperCase().trim();
      if (!id) {
        return m.reply(claraWrap("Pesan Terjadwal", "Format: *.pesanjadwal del <id>*\n\nLihat ID di *.pesanjadwal list*", "error"));
      }
      const r = cancelReminder(id, sender);
      if (!r) {
        return m.reply(claraWrap("Pesan Terjadwal", `Pesan terjadwal *${id}* gak ketemu (atau udah kekirim). Cek *.pesanjadwal list*`, "error"));
      }
      return m.reply(claraWrap("Pesan Terjadwal Dibatalkan", [
        `ID: ${r.id}`,
        `Pesan: ${r.message}`,
        `Jadwal: ${formatWib(r.fireAt)}`,
        "", "✅ Countdown-nya juga udah berhenti",
      ], "success"));
    }

    // ═══ STATUS ═══
    if (sub === "status") {
      const mine = listActiveReminders(sender).filter((r) => r.kind === "pesanjadwal");
      const all = global.novaReminders?.filter((r) => r && !r.fired && r.kind === "pesanjadwal").length || 0;
      return m.reply(claraWrap("Pesan Terjadwal", [
        `Pesan terjadwal kamu: *${mine.length}* aktif`,
        `Total semua user: *${all}*`,
        "", "💡 *.pesanjadwal list* untuk detail",
      ], "info"));
    }

    // ═══ ADD: "<waktu> | <pesan>" ═══
    const pipeParts = raw.split("|");
    if (pipeParts.length < 2) {
      return m.reply(claraWrap("Pesan Terjadwal", [
        "Format: *.pesanjadwal <waktu> | <pesan>*",
        "",
        "Contoh: *.pesanjadwal besok 07:00 | jangan lupa rapat pagi*",
        "Waktu: HH:MM / besok HH:MM / lusa HH:MM / DD-MM[-YYYY] [HH:MM]",
        "",
        "💡 Wajib pakai tanda | pemisah waktu dan pesan",
      ], "error"));
    }
    const whenStr = (pipeParts[0] || "").trim();
    const message = pipeParts.slice(1).join("|").trim();
    if (!message) {
      return m.reply(claraWrap("Pesan Terjadwal", "Pesannya gak boleh kosong!\n\nContoh: *.pesanjadwal besok 07:00 | jangan lupa rapat*", "error"));
    }
    if (message.length > 200) {
      return m.reply(claraWrap("Pesan Terjadwal", "Pesan terlalu panjang (max 200 karakter)", "error"));
    }
    const fireAt = parseWhen(whenStr);
    if (!fireAt) {
      return m.reply(claraWrap("Pesan Terjadwal", [
        `Waktu *"${whenStr}"* gak dikenali.`,
        "",
        "Format: HH:MM / besok HH:MM / lusa HH:MM / DD-MM[-YYYY] [HH:MM]",
        "Contoh: 19:30 · besok 07:00 · 25-12 08:00 · 25-12-2026 07:30",
      ], "error"));
    }
    const minTs = Date.now() + 60000; // min 1 menit ke depan
    const maxTs = Date.now() + 365 * 86400000; // max 1 tahun
    if (fireAt < minTs) {
      return m.reply(claraWrap("Pesan Terjadwal", "Waktunya kelewat deket banget (min 1 menit ke depan).\n\nUntuk hitungan detik pakai *.remind <durasi>*", "warn"));
    }
    if (fireAt > maxTs) {
      return m.reply(claraWrap("Pesan Terjadwal", "Jangkauan maksimal 1 tahun ke depan.", "warn"));
    }

    const mine = listActiveReminders(sender).filter((r) => r.kind === "pesanjadwal");
    if (mine.length >= MAX) {
      return m.reply(claraWrap("Pesan Terjadwal", `Maksimal ${MAX} pesan terjadwal aktif per user!\n\n*.pesanjadwal list* untuk lihat, *.pesanjadwal del <id>* untuk hapus`, "warn"));
    }

    // buat + arm via engine (persist biar tahan restart)
    const reminder = {
      id: genId(),
      kind: "pesanjadwal",
      jid: chatId,
      sender,
      senderName: m.pushName || sender.split("@")[0],
      message,
      fireAt,
      createdAt: Date.now(),
      fired: false,
      timerId: null,
    };
    global.novaReminders.push(reminder);
    armReminder(sock, reminder);
    persistReminders();

    await m.react("🐣");
    // 🔹 LIVE COUNTDOWN 🕒 — sisa nge-tick sampai keping; del → isCancelled
    // → final closing "DIBATALKAN" (bukan "waktu habis")
    const card = (remainingMs, live = true) => claraWrap("Pesan Terjadwal Dibuat", [
      `ID: ${reminder.id}`,
      `Pesan: ${message}`,
      `Kirim dalam: ${formatRemaining(remainingMs)}${live ? " 🕒" : ""}`,
      `Waktu kirim: ${formatWib(fireAt)}`,
      "",
      `💡 *.pesanjadwal list* — *.pesanjadwal del ${reminder.id}*`,
    ], "success");
    return runLiveTicker({
      sock, chat: chatId, m,
      mode: "down", targetTs: Number(fireAt), maxEdits: Number(process.env.NOVA_TICK_MAXEDITS) || 24,
      initialCard: card(fireAt - Date.now()),
      tickCard: (st) => card(st.remainingMs, st.remainingMs > 0),
      finalCard: () => reminder.cancelled
        ? claraWrap("Pesan Terjadwal Dibatalkan", [
            `ID: ${reminder.id}`,
            `Pesan: ${message}`,
            "", "✅ Pesan ini dibatalkan — gak akan dikirim",
          ], "warn")
        : claraWrap("Pesan Terjadwal Terkirim", [
            `ID: ${reminder.id}`,
            `Pesan: ${message}`,
            "", "📋 Waktunya tiba — pesan udah dikirim di atas 👆",
          ], "success"),
      isCancelled: () => reminder.cancelled === true,
    });
  } catch (err) {
    console.error("[pesanjadwal]", err.message);
    await m.react("❌");
    return m.reply(claraWrap("Pesan Terjadwal", "⚠️ Ada error. Coba lagi ya."));
  }
}

export { pluginConfig as config, handler };
