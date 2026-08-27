// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * plugins/owner/loker.js
 * Command .loker — konfigurasi scheduler lowongan kerja otomatis (owner only).
 */

import {
  getLokerStatus,
  updateLokerSettings,
  fetchNewJobs,
  fetchAllIndonesiaJobs,
  fetchTheMuse,
  fetchJobicy,
  formatLokerMessage,
  getSentIds,
  startLokerJobs,
  stopLokerJob,
} from "../../src/lib/nova-loker-scheduler.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import config from "../../config.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "loker",
  alias: ["loker"],
  category: "owner",
  description: "Atur pengiriman info lowongan kerja otomatis ke grup",
  usage: ".loker <aksi>",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const CATEGORY_OPTIONS = [
  "software-dev", "design", "marketing", "sales", "customer-support",
  "data", "finance", "hr", "management", "writing", "qa", "devops",
  "product", "legal",
];

function formatSchedule(schedules) {
  return (schedules || [])
    .map(
      (s) =>
        `${s.label || s.key} ${String(s.hour).padStart(2, "0")}:${String(s.minute || 0).padStart(2, "0")}`
    )
    .join(", ");
}

function help(m) {
  // Build help text using concatenation to avoid nested template literal issues
  const p = m.prefix || ".";
  const lines = [
    "*ᴘᴇɴɢᴀᴛᴜʀᴀɴ ɪɴꜰᴏ ʟᴏᴋᴇʀ ᴏᴛᴏᴍᴀᴛɪꜱ*",
    "",
    "`" + p + "loker aktif`",
    "  Aktifkan broadcast loker di grup ini (akan meminta pilihan mode).",
    "",
    "`" + p + "loker pilih <opsi>`",
    "  Pilih mode setelah menjalankan aktif. Opsi: group | group_channel | private",
    "  Contoh: `.loker pilih group`",
    "",
    "`" + p + "loker nonaktif`",
    "  Matikan broadcast loker untuk grup ini.",
    "",
    "`" + p + "loker kata kunci [kata...]`",
    "  Set filter kata kunci (pisah spasi).",
    "  Contoh: " + p + "loker kata kunci developer python",
    "",
    "`" + p + "loker kategori [nama]`",
    "  Filter berdasarkan kategori Remotive.",
    "  Opsi: " + CATEGORY_OPTIONS.slice(0, 6).join(", ") + ", dst.",
    "  Contoh: " + p + "loker kategori software-dev",
    "",
    "`" + p + "loker jadwal 08:00 13:00 20:00`",
    "  Atur jam broadcast (maks 3 waktu).",
    "",
    "`" + p + "loker jumlah 5`",
    "  Jumlah loker per broadcast (1–10).",
    "",
    "`" + p + "loker sumber [nama]`",
    "  Lihat/toggle sumber loker: jobstreet, glints, kalibrr, indeed, remotive, arbeitnow",
    "  Contoh: " + p + "loker sumber jobstreet",
    "",
    "`" + p + "loker test`",
    "  Kirim preview loker sekarang ke chat ini.",
    "",
    "`" + p + "loker status`",
    "  Lihat konfigurasi aktif.",
    "",
    "`" + p + "loker reset`",
    "  Hapus cache loker yang sudah terkirim.",
    "",
    "Sumber: Remotive, Arbeitnow, The Muse, Jobicy (gratis, tanpa API key).",
  ];

  return m.reply(lines.join("\n"));
}

function parseTime(value) {
  const match = String(value || "").match(/^([01]?\d|2[0-3])[:.]([0-5]\d)$/);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function buildSchedules(args) {
  const labels = ["Pagi", "Siang", "Sore"];
  const keys = ["pagi", "siang", "sore"];
  const times = (args || []).slice(0, 3);
  if (!times.length) return null;
  const result = times.map((v, i) => {
    const t = parseTime(v);
    return t ? { ...t, key: keys[i] || `t${i}`, label: labels[i] || `Waktu ${i + 1}` } : null;
  });
  return result.every(Boolean) ? result : null;
}

async function handler(m, { sock }) {
  const args = (m.args || []).map((a) => String(a).trim()).filter(Boolean);
  const action = (args.shift() || "help").toLowerCase();

  if (action === "help" || action === "menu") return help(m);

  // ── AKTIF (menu pilihan mode) ─────────────────────────────────────────
  if (action === "aktif" || action === "on" || action === "enable") {
    if (!m.isGroup) {
      return m.reply(claraWrap("Loker", "⚠️ Command ini hanya bisa dipakai di dalam grup."));
    }

    const prompt = [
      "🔧 Pilih mode Loker Otomatis yang ingin diaktifkan:",
      "",
      "1. Buat Grup saja — kirim ke grup ini saja.",
      "   → Ketik: `.loker pilih group`",
      "",
      "2. Grup & Saluran — kirim ke grup ini + saluran (jika disetel).",
      "   → Ketik: `.loker pilih group_channel`",
      "",
      "3. Pesan Privat ke saya — hanya pengaktif yang menerima notifikasi via DM.",
      "   → Ketik: `.loker pilih private`",
      "",
      "Contoh: `.loker pilih group`",
    ].join("\n");

    return m.reply(prompt);
  }

  // ── PILIH MODE setelah prompt ─────────────────────────────────────────
  if (action === "pilih" || action === "mode") {
    const choice = (args[0] || "").toLowerCase();
    const valid = ["group", "group_channel", "groupchannel", "private", "1", "2", "3"];
    if (!valid.includes(choice) && !["group","group_channel","private"].includes(choice)) {
      return m.reply(claraWrap("Loker", "❌ Opsi tidak dikenali. Gunakan: group | group_channel | private"));
    }

    let mode = choice;
    if (choice === "1") mode = "group";
    if (choice === "2") mode = "group_channel";
    if (choice === "3") mode = "private";
    if (choice === "groupchannel") mode = "group_channel";

    const jid = m.chat;
    const sender = m.sender;

    const settings = updateLokerSettings((cur) => {
      const next = { ...cur };
      next.enabled = true;
      const targets = Array.isArray(next.targets) ? [...next.targets] : [];

      if (mode === "group") {
        if (!targets.includes(jid)) targets.push(jid);
      } else if (mode === "group_channel") {
        if (!targets.includes(jid)) targets.push(jid);
        const channelId = config.saluran?.id || null;
        if (channelId && !targets.includes(channelId)) targets.push(channelId);
      } else if (mode === "private") {
        if (!targets.includes(sender)) targets.push(sender);
      }

      next.targets = targets;
      return next;
    });

    startLokerJobs(settings);

    if (mode === "group") {
      return m.reply(claraWrap("Loker", `✅ Loker otomatis diaktifkan (mode: Grup). Broadcast akan dikirim ke grup ini (${jid}).\nJadwal: ${formatSchedule(settings.schedules)} WIB`));
    }

    if (mode === "group_channel") {
      const channelId = config.saluran?.id || "(tidak disetel)";
      return m.reply(claraWrap("Loker", `✅ Loker otomatis diaktifkan (mode: Grup & Saluran).\nGrup: ${jid}\nSaluran: ${channelId}\nJadwal: ${formatSchedule(settings.schedules)} WIB`));
    }

    if (mode === "private") {
      return m.reply(claraWrap("Loker", `✅ Loker otomatis diaktifkan (mode: Pesan Privat). Kamu (${sender}) akan menerima notifikasi loker via DM.`));
    }
  }

  // ── NONAKTIF ──────────────────────────────────────────────────────────
  if (action === "nonaktif" || action === "off" || action === "disable") {
    if (!m.isGroup) {
      return m.reply(claraWrap("Loker", "⚠️ Command ini hanya bisa dipakai di dalam grup."));
    }
    const jid = m.chat;
    const settings = updateLokerSettings((cur) => {
      const targets = (Array.isArray(cur.targets) ? cur.targets : []).filter((t) => t !== jid);
      return { ...cur, targets, enabled: targets.length > 0 };
    });
    if (!settings.targets.length) stopLokerJob();
    return m.reply(
      settings.targets.length
        ? "✅ Broadcast loker dinonaktifkan untuk grup ini."
        : "✅ Broadcast loker dinonaktifkan (tidak ada grup tersisa)."
    );
  }

  // ── KATA KUNCI ─────────────────────────────────────────────────────────
  if (action === "kata" || action === "keyword" || action === "filter") {
    if (action === "kata" && args[0]?.toLowerCase() === "kunci") args.shift();
    const keywords = args.filter(Boolean);

    const settings = updateLokerSettings((cur) => ({ ...cur, keywords }));

    return m.reply(
      keywords.length
        ? `✅ Kata kunci loker diset: _${keywords.join(", ")}_`
        : "✅ Kata kunci loker dibersihkan (tidak ada kata kunci)."
    );
  }

  // ── KATEGORI ──────────────────────────────────────────────────────────
  if (action === "kategori" || action === "category") {
    const choice = (args[0] || "").toLowerCase();
    if (!choice) {
      return m.reply(claraWrap("Loker", `🔎 Opsi kategori: ${CATEGORY_OPTIONS.join(', ')}`));
    }
    if (!CATEGORY_OPTIONS.includes(choice)) {
      return m.reply(claraWrap("Loker", `❌ Kategori tidak dikenal. Opsi: ${CATEGORY_OPTIONS.join(', ')}`));
    }
    const settings = updateLokerSettings((cur) => ({ ...cur, category: choice }));
    return m.reply(claraWrap("Loker", `✅ Kategori loker diset: ${choice}`));
  }

  // ── JADWAL ──────────────────────────────────────────────────────────
  if (action === "jadwal" || action === "schedule") {
    const schedules = buildSchedules(args);
    if (!schedules) return m.reply(claraWrap("loker", "❌ Format jadwal salah. Contoh: .loker jadwal 08:00 13:00 20:00"));
    const settings = updateLokerSettings((cur) => ({ ...cur, schedules }));
    return m.reply(claraWrap("Loker", `✅ Jadwal disimpan: ${formatSchedule(schedules)} WIB`));
  }

  // ── JUMLAH ──────────────────────────────────────────────────────────
  if (action === "jumlah" || action === "count" || action === "number") {
    const n = parseInt(args[0]);
    if (isNaN(n) || n < 1 || n > 10) return m.reply(claraWrap("Loker", "❌ Jumlah harus angka antara 1-10"));
    const settings = updateLokerSettings((cur) => ({ ...cur, maxPerBroadcast: n }));
    return m.reply(claraWrap("Loker", `✅ Jumlah loker per broadcast diset: ${n}`));
  }

  // ── TEST (kirim preview) ──────────────────────────────────────────────
  if (action === "test") {
    try {
      const settings = getLokerStatus();
      const sentIds = getSentIds(getDatabase());
      const jobs = await fetchNewJobs({
        sources: settings.sources,
        keywords: settings.keywords,
        categories: settings.categories,
        limit: settings.maxPerBroadcast || 3,
        sentIds,
      });
      if (!jobs || !jobs.length) return m.reply(claraWrap("Loker", "Tidak ada loker baru ditemukan saat ini."));
      const msg = formatLokerMessage(jobs, { label: "Preview", keywords: settings.keywords });
      if (!msg) return m.reply(claraWrap("Loker", "Tidak ada loker yang bisa ditampilkan."));
      return await m.reply( msg, "loker");
    } catch (e) {
      return m.reply(claraWrap("loker", `❌ Gagal kirim preview: ${e.message}`));
    }
  }

  // ── SUMBER (toggle sources) ──────────────────────────────────────────
  if (action === "sumber" || action === "sources") {
    const AVAILABLE = ["jobstreet", "glints", "kalibrr", "indeed", "remotive", "arbeitnow"];
    const choice = (args[0] || "").toLowerCase();

    if (!choice) {
      const current = getLokerStatus();
      const active = current?.sources || [];
      let txt = "*ꜱᴜᴍʙᴇʀ ʟᴏᴋᴇʀ ᴀᴋᴛɪꜰ:*\n\n";
      for (const src of AVAILABLE) {
        const isActive = active.includes(src);
        txt += `${isActive ? "[x]" : "[ ]"} ${src}\n`;
      }
      txt += "\nToggle: .loker sumber <nama>\n";
      txt += "Reset semua: .loker sumber reset";
      return await m.reply( txt, "loker");
    }

    if (choice === "reset" || choice === "all") {
      const settings = updateLokerSettings((cur) => ({ ...cur, sources: AVAILABLE }));
      return m.reply(claraWrap("Info", "\u2705 Semua sumber loker diaktifkan: " + AVAILABLE.join(", ")));
    }

    if (!AVAILABLE.includes(choice)) {
      return m.reply(claraWrap("Loker", `Sumber tidak dikenal. Tersedia: ${AVAILABLE.join(", ")}`));
    }

    const settings = updateLokerSettings((cur) => {
      const sources = Array.isArray(cur.sources) ? [...cur.sources] : [];
      const idx = sources.indexOf(choice);
      if (idx !== -1) {
        sources.splice(idx, 1);
      } else {
        sources.push(choice);
      }
      return { ...cur, sources };
    });

    const isActive = settings.sources.includes(choice);
    return m.reply(claraWrap("Loker", `Sumber *${choice}* ${isActive ? "diaktifkan" : "dinonaktifkan"}.
Sumber aktif: ${settings.sources.join(", ") || "(kosong)"}`));
  }

  // ── STATUS ──────────────────────────────────────────────────────────
  if (action === "status") {
    const status = getLokerStatus();
    const enabled = status?.enabled ? "Ya" : "Tidak";
    const targets = Array.isArray(status?.targets) && status.targets.length ? status.targets.join(", ") : "(kosong)";
    const jadwal = formatSchedule(status?.schedules || []);
    const kategori = Array.isArray(status?.categories) && status.categories.length ? status.categories.join(", ") : "(tidak diset)";
    const perBatch = status?.maxPerBroadcast || "(default)";
    const keywords = Array.isArray(status?.keywords) && status.keywords.length ? status.keywords.join(", ") : "(kosong)";
    const sources = Array.isArray(status?.sources) && status.sources.length ? status.sources.join(", ") : "(default)";

    const out = [
      "*ꜱᴛᴀᴛᴜꜱ ʟᴏᴋᴇʀ*",
      "",
      `Enabled: ${enabled}`,
      `Targets: ${targets}`,
      `Jadwal: ${jadwal || "(tidak ada)"} WIB`,
      `Kategori: ${kategori}`,
      `Per Broadcast: ${perBatch}`,
      `Keywords: ${keywords}`,
      `Sumber: ${sources}`,
    ].join("\n");

    return m.reply(out);
  }

  // ── RESET CACHE / SENT IDS ────────────────────────────────────────────
  if (action === "reset") {
    try {
      const db = getDatabase();
      db.setting("lokerSentIds", {});
      return m.reply(claraWrap("Loker", "✅ Cache loker (sentIds) berhasil di-reset."));
    } catch (e) {
      return m.reply(claraWrap("loker", `❌ Gagal reset: ${e.message}`));
    }
  }

  // Default
  return help(m);
}

export { pluginConfig as config, handler };
