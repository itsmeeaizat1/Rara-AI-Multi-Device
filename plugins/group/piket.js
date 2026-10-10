// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: Piket
 * Fitur: .piket — Auto-Piket: rotasi tugas piket grup otomatis (feat/auto-piket).
 *        Daftar anggota sekali → bot umumkan tiap pagi siapa yang piket,
 *        nag kalau belum ack, tuker otomatis kalau izin, riwayat + streak.
 *        100% lokal (gak ada API eksternal).
 */
import {
  registerPiket, markDone, markIzin, setPiketJam,
  pausePiket, resumePiket, removePiket, getPiketState,
} from "../../src/lib/rara-piket.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "piket",
  alias: ["autopiket", "jadwalpiket"],
  category: "group",
  description: "Auto-Piket — rotasi tugas piket grup otomatis, umum pagi + nag + riwayat",
  usage: ".piket <daftar|done|izin|riwayat|info|jam|pause|lanjut|hapus>",
  example: ".piket daftar @a @b @c\n.piket done\n.piket jam 07:00",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

function menuCard(prefix, extraNote) {
  return raraWrap("Piket", [
    "🧹 *AUTO-PIKET* — rotasi tugas piket otomatis",
    ...(extraNote ? ["", extraNote] : []),
    "",
    `ᯓ \`${prefix}piket daftar @a @b @c\` — set urutan rotasi (sekali doang)`,
    `ᯓ \`${prefix}piket done\` — ack: piket hari ini beres`,
    `ᯓ \`${prefix}piket izin\` — gak bisa? auto-diganti, pindah ke belakang`,
    `ᯓ \`${prefix}piket info\` — giliran sekarang & berikutnya`,
    `ᯓ \`${prefix}piket riwayat\` — log piket + streak rajin`,
    `ᯓ \`${prefix}piket jam 07:00\` — atur jam umum pagi (default 07:00)`,
    `ᯓ \`${prefix}piket pause 2h\` — rehat rotasi (2h/1d/7d)`,
    `ᯓ \`${prefix}piket lanjut\` — lanjut rotasi dari orang yang sama`,
    `ᯓ \`${prefix}piket hapus\` — stop & hapus piket grup ini`,
    "",
    "_bot umumkan tiap pagi, nag kalau belum ack, gak ada API eksternal_",
  ]);
}

const DUR = { m: 60e3, h: 3600e3, d: 86400e3 };
function parseDur(s) {
  const m = /^(\d+)(m|h|d)$/i.exec(String(s || "").trim());
  if (!m) return null;
  return parseInt(m[1], 10) * DUR[m[2].toLowerCase()];
}
function phoneOf(jid) {
  return String(jid || "").split("@")[0] || "kawan";
}

export async function handler(m, { sock, config: botConfig } = {}) {
  const prefix = botConfig?.command?.prefix || m.prefix || ".";
  const sub = String(m.args?.[0] || "").toLowerCase();
  const arg = String(m.args?.[1] || "").trim();
  const gid = m.chat;

  // DM / bukan grup
  if (!m.isGroup) {
    return m.reply(menuCard(prefix, "_khusus grup — ajak grupmu daftar dulu_"));
  }

  // ── daftar ──
  if (sub === "daftar" || sub === "start" || sub === "mulai") {
    const cands = [...(m.mentionedJid || []), ...(m.args?.slice(1) || [])];
    const jids = [...new Set(cands.map((c) => {
      const s = String(c || "").trim();
      return s.includes("@") ? s : (/^\d{5,}$/.test(s) ? `${s}@s.whatsapp.net` : null);
    }).filter(Boolean))];
    if (jids.length < 1) {
      return m.reply(raraWrap("Piket", [
        "🎯 *Daftar Piket*",
        "",
        `Format: \`${prefix}piket daftar @a @b @c\``,
        `Minimal 1 anggota — tag anggota grup yang mau ikut rotasi.`,
        "",
        `Contoh: \`${prefix}piket daftar @Budi @Ani @Cici\``,
      ]));
    }
    const res = registerPiket(gid, jids);
    if (!res.ok) return m.reply(raraWrap("Piket", "Gagal daftar — coba ulangi."));
    await m.react("🧹");
    return m.reply(raraWrap("Piket", [
      "🎉 *PIKET AKTIF!*",
      "",
      `👥 Anggota (${jids.length}): ` + jids.map((j) => `@${phoneOf(j)}`).join(", "),
      `🧹 Urutan tersimpan — bot umumkan giliran tiap pagi.`,
      "",
      `Cek giliran: \`${prefix}piket info\``,
      `Ack giliranmu: \`${prefix}piket done\``,
      "",
      "_yang izin otomatis pindah ke paling belakang_",
    ]));
  }

  // semua sub lain wajib udah daftar
  const st = getPiketState(gid);
  if (!st) {
    return m.reply(menuCard(prefix, "_grup ini belum daftar piket_"));
  }

  // ── done ──
  if (sub === "done" || sub === "beres") {
    const res = markDone(gid, m.sender);
    if (!res.ok && res.error === "bukan-giliran") {
      return m.reply(raraWrap("Piket", [
        "🤨 *Bukan Giliranmu*",
        "",
        `Hari ini giliran: @${phoneOf(res.duty.jid)}`,
        "Nunggu aja tanggalnya 😌",
      ]));
    }
    if (!res.ok) return m.reply(menuCard(prefix, "_grup belum daftar_"));
    await m.react("✅");
    return m.reply(raraWrap("Piket", [
      "✅ *PIKET BERES!*",
      "",
      `🧹 Makasih @${phoneOf(m.sender)} — ruangan lega!`,
      `🔥 Streak rajin: ${res.state.streak[m.sender] || 0}x`,
      "",
      `_besok giliran orang berikutnya (cek \`${prefix}piket info\`)_`,
    ]));
  }

  // ── izin ──
  if (sub === "izin") {
    const res = markIzin(gid, m.sender);
    if (!res.ok && res.error === "bukan-giliran") {
      return m.reply(raraWrap("Piket", [
        "🤨 *Bukan Giliranmu*",
        "",
        `Hari ini giliran: @${phoneOf(res.duty.jid)}`,
        `Izin cuma buat yang lagi piket 😌`,
      ]));
    }
    if (!res.ok) return m.reply(menuCard(prefix, "_grup belum daftar_"));
    const next = res.state.members[res.state.pointer];
    await m.react("🙏");
    return m.reply(raraWrap("Piket", [
      "🙏 *IZIN DICATET*",
      "",
      `@${phoneOf(m.sender)} pindah ke paling belakang.`,
      `🧹 Pengganti hari ini: @${phoneOf(next.jid)}`,
      "",
      `_semangat, jangan sering-sering ya_`,
    ]));
  }

  // ── info ──
  if (sub === "info" || sub === "") {
    const cur = st.members[st.pointer];
    const nxt = st.members[(st.pointer + 1) % st.members.length];
    const status = st.todayStatus === "done" ? "✅ beres" : st.todayStatus === "izin" ? "🙏 diizin" : "⏳ menunggu ack";
    return m.reply(raraWrap("Piket", [
      "🧹 *INFO PIKET*",
      "",
      `📌 Hari ini: @${phoneOf(cur.jid)} (${status})`,
      `➡️ Berikutnya: @${phoneOf(nxt.jid)}`,
      `⏰ Umum tiap: ${String(st.hour).padStart(2, "0")}:${String(st.minute).padStart(2, "0")} WIB`,
      st.pausedUntil ? "⏸️ Status: di-pause (`.piket lanjut` buat aktif)" : "▶️ Status: aktif",
      "",
      `👥 Rotasi (${st.members.length}): ` + st.members.map((x) => `@${phoneOf(x.jid)}`).join(" → "),
    ]));
  }

  // ── riwayat ──
  if (sub === "riwayat" || sub === "log") {
    const rows = (st.history || []).slice(-10).reverse();
    const icon = { done: "✅", izin: "🙏", missed: "💤" };
    const streaks = Object.entries(st.streak || {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    return m.reply(raraWrap("Piket", [
      "📜 *RIWAYAT PIKET* (10 terakhir)",
      "",
      ...(rows.length
        ? rows.map((r) => `${icon[r.status] || "•"} ${r.date} — ${r.name || phoneOf(r.jid)} (${r.status})`)
        : ["_belum ada catatan_"]),
      "",
      "🔥 *Streak Rajin*",
      ...(streaks.length ? streaks.map(([j, n]) => `▪ @${phoneOf(j)} — ${n}x`) : ["_belum ada_"]),
    ]));
  }

  // ── jam ──
  if (sub === "jam" || sub === "waktu") {
    const res = setPiketJam(gid, arg);
    if (!res.ok) {
      return m.reply(raraWrap("Piket", [
        "❗ *Jam Gak Valid*",
        "",
        `Format: \`${prefix}piket jam HH:MM\` (00:00–23:59)`,
        `Contoh: \`${prefix}piket jam 07:00\``,
      ]));
    }
    return m.reply(raraWrap("Piket", [
      "⏰ *JAM DIUBAH*",
      "",
      `Umum piket tiap ${String(res.state.hour).padStart(2, "0")}:${String(res.state.minute).padStart(2, "0")} WIB`,
    ]));
  }

  // ── pause ──
  if (sub === "pause" || sub === "rehat") {
    const ms = parseDur(arg);
    if (!ms) {
      return m.reply(raraWrap("Piket", [
        "⏸️ *Pause Piket*",
        "",
        `Format: \`${prefix}piket pause <durasi>\``,
        `Contoh: \`${prefix}piket pause 2h\` (2h / 1d / 7d)`,
      ]));
    }
    const res = pausePiket(gid, ms);
    if (!res.ok) return m.reply(menuCard(prefix));
    return m.reply(raraWrap("Piket", [
      "⏸️ *PIKET DI-PAUSE*",
      "",
      `Bot diem dulu. Lanjut dengan \`${prefix}piket lanjut\` — giliran gak berubah.`,
    ]));
  }

  // ── lanjut ──
  if (sub === "lanjut" || sub === "resume") {
    const res = resumePiket(gid);
    if (!res.ok) return m.reply(menuCard(prefix));
    return m.reply(raraWrap("Piket", "▶️ *Piket lanjut* — giliran tetap sama kayak sebelumnya."));
  }

  // ── hapus ──
  if (sub === "hapus" || sub === "stop" || sub === "matikan") {
    const res = removePiket(gid);
    if (!res.ok) return m.reply(menuCard(prefix, "_belum ada piket di grup ini_"));
    await m.react("🧹");
    return m.reply(raraWrap("Piket", [
      "🗑️ *PIKET DIHAPUS*",
      "",
      "Riwayat & rotasi grup ini dibersihkan.",
      `Mau mulai lagi? \`${prefix}piket daftar @a @b\``,
    ]));
  }

  // ── sub gak dikenal / tanpa arg ──
  await m.react("❓");
  return m.reply(menuCard(prefix));
}

export { pluginConfig as config };
