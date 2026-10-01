// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// animenotify.js — Auto Anime Notifier (request owner 8 Sep 2026, ala script
// standalone "anime notifier bot" owner). Sumber: AniList GraphQL (utama)
// → Kitsu (fallback). Per-chat opt-in:
//   • .animenotify on/off   — langganan / berhenti di chat ini
//   • .animenotify status    — status langganan + global
//   • .animenotify now       — paksa kirim daftar releasing terkini
//   • .animenotify season    — preview seasonal dari MAL/Jikan (manual)
// Toggle GLOBAL (pause/resume semua polling): .switch auto autoanimenotifier on/off

import {
  addTarget, removeTarget, isTarget, getStatus, isEnabled, runCheck,
  getSeasonPreview, formatSeasonMessage, setSock, syncMonitor,
  getGenres, addGenre, removeGenre, previewWatchlist,
  getContentTypes, setContentType, DIGEST_LABELS,
  setIntervalMenit, getListMode, setListMode,
} from "../../src/lib/rara-auto-anime-notifier.js";
import { raraError, raraGuide, raraGuideV2, raraSuccess } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "animenotify",
  alias: ["animenotif", "aninotify"],
  category: "anime",
  description: "Auto notifikasi anime terbaru (AniList → Kitsu) — langganan per-chat",
  usage: ".animenotify <on/off/info/list/now/season/interval>",
  example: ".animenotify on\n.animenotify season",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, args }) {
  const sub = String(args?.[0] || "").toLowerCase();

  if (sub === "on") {
    await m.react("🕒");
    const chatId = m.chat;
    if (isTarget(chatId)) return m.reply(raraSuccess(pluginConfig.name, "chat ini udah langganan anime notifier"));
    addTarget(chatId);
    if (!isEnabled()) {
      return m.reply(
        raraSuccess(pluginConfig.name, "chat ini terdaftar — tapi fitur auto masih OFF global, owner bisa nyalain via .switch auto autoanimenotifier on"),
      );
    }
    // Anti dobel-kirim: monitor BARU start + first-run belum pernah jalan →
    // sample + semua digest aktif otomatis nge-flow ke semua target (termasuk
    // chat ini) — skip force. Kalau monitor udah jalan / first-run udah lewat →
    // force kirim salinan langsung ke chat ini sebagai sambutan.
    const stBefore = getStatus();
    const sr = syncMonitor();
    const firstRunFlow = sr?.started && !stBefore.initDone;
    if (!firstRunFlow) {
      const res = await runCheck({ force: true, chatId }).catch((e) => ({ err: e }));
      if (res?.err) return m.reply(raraError(pluginConfig.name, "gagal ambil data: " + res.err.message));
    }
    await m.react("🐣");
    return m.reply(raraSuccess(pluginConfig.name, "aktif di chat ini — semua tipe konten aktif otomatis masuk (sample + digest lagi dikirim di atas)"));
  }

  if (sub === "off") {
    removeTarget(m.chat);
    return m.reply(raraSuccess(pluginConfig.name, "chat ini berhenti langganan anime notifier"));
  }

  if (sub === "status") {
    const st = getStatus();
    const lines = [
      `Langganan chat ini: ${isTarget(m.chat) ? "AKTIF" : "BELUM"}`,
      `Fitur global: ${st.enabled ? "ON" : "OFF"} (.switch auto autoanimenotifier)`,
      `Monitor: ${st.running ? "JALAN" : "STOP"}`,
      `Total subscriber: ${st.targets.length} chat`,
      `Interval: tiap ${st.intervalMenit} menit`,
      `Sumber: AniList → Kitsu (fallback)`,
      `Cek terakhir: ${st.lastCheck ? new Date(st.lastCheck).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "belum pernah"} (${st.lastSource || "-"})`,
      `Tipe konten: ${Object.entries(getContentTypes()).filter(([, on]) => on !== false).map(([k]) => k).join(", ") || "semua off"} (.animenotify info)`,
      `Mode list: ${getListMode() ? "ON (beberapa info per digest)" : "OFF (cuma 1 info anime terbaru per digest)"} (.animenotify list)`,
    ];
    return m.reply(`「 ✦ ${pluginConfig.name.toUpperCase()} ✦ 」\n` + lines.join("\n"));
  }

  if (sub === "info" || sub === "tipe" || sub === "opsi") {
    const tipe = String(args?.[1] || "").toLowerCase();
    const onOff = String(args?.[2] || "").toLowerCase();
    const types = getContentTypes();

    // tanpa tipe → menu status semua tipe
    if (!tipe || !["on", "off", "aktif", "mati"].includes(onOff)) {
      const lines = Object.entries(DIGEST_LABELS).map(([key, label]) => {
        const on = types[key] !== false;
        return `${on ? "🟢" : "🔴"} *${key}* — ${label}\n   ${on ? "ON" : "OFF"} · atur: .animenotify info ${key} ${on ? "off" : "on"}`;
      });
      return m.reply(
        `「 ✦ ${pluginConfig.name.toUpperCase()} — TIPE KONTEN ✦ 」\n\n` +
        lines.join("\n\n") +
        `\n\n💡 Aktif/mati semua: .animenotify info semua on|off` +
        `\n💡 Kirim semua tipe aktif sekarang: .animenotify now`
      );
    }

    const action = (onOff === "on" || onOff === "aktif");
    const res = setContentType(tipe, action);
    if (!res) {
      return m.reply(raraError(pluginConfig.name, `tipe gak dikenal: ${tipe} — ketik .animenotify info buat daftar tipe`));
    }
    return m.reply(raraSuccess(pluginConfig.name, `tipe *${tipe}* sekarang ${action ? "AKTIF" : "MATI"} — notifikasi terkait ${action ? "bakal masuk" : "gak bakal dikirim"}`));
  }

  // ── MODE LIST (request owner 10 Sep 2026: "klo anime notifier aktif jd yg
  // dikirim cm 1 info anime terbaru aja jgn spam smpe 5 info anime, bentuk
  // list jg off kcuali di on") ──
  if (sub === "list" || sub === "mode") {
    const action = String(args?.[1] || "").toLowerCase();
    if (action === "on" || action === "aktif") {
      setListMode(true);
      return m.reply(raraSuccess(pluginConfig.name, "Mode List *ON* — digest anime (terbaru/hangat) kirim beberapa card + rangkuman"));
    }
    if (action === "off" || action === "mati") {
      setListMode(false);
      return m.reply(raraSuccess(pluginConfig.name, "Mode List *OFF* — digest anime cuma kirim *1 info anime terbaru* per notifikasi (anti-spam)"));
    }
    return m.reply(raraGuideV2(pluginConfig.name, {
      kaomoji: "(๑˃ᴗ˂)ﻭ",
      sapaan: `mode list sekarang *${getListMode() ? "ON" : "OFF"}* — mau diubah?`,
      cara: "ketik .animenotify list on atau off",
      contoh: ".animenotify list on",
      note: getListMode() ? "ON = digest kirim beberapa card anime + rangkuman sisa" : "OFF = digest cuma kirim 1 info anime terbaru (anti-spam, default)",
    }));
  }

  // Interval cek (menit, 5-720) — request owner 9 Sep: "cek tiap 1 jam bisa diset"
  if (sub === "interval" || sub === "jadwal") {
    const val = Number(args?.[1]);
    const st = getStatus();
    if (!val) {
      return m.reply(raraGuideV2(pluginConfig.name, {
        kaomoji: "(๑˃ᴗ˂)ﻭ",
        sapaan: `interval cek sekarang tiap ${st.intervalMenit} menit — mau diatur?`,
        cara: "ketik .animenotify interval <menit> (5–720)",
        contoh: ".animenotify interval 60",
        note: "begitu ada anime atau episode baru terdeteksi langsung dikirim ke subscriber (dedup, gak dobel)",
      }));
    }
    const res = setIntervalMenit(val);
    if (!res) {
      return m.reply(raraError(pluginConfig.name, "interval harus 5–720 menit (contoh: .animenotify interval 60)"));
    }
    return m.reply(raraSuccess(pluginConfig.name, `interval cek sekarang *tiap ${res} menit* — monitor di-restart, info baru langsung dikirim begitu terdeteksi`));
  }

  if (sub === "now") {
    await m.react("🕒");
    if (!isTarget(m.chat)) {
      return m.reply(raraGuide(pluginConfig.name, "chat ini belum langganan — ketik .animenotify on dulu", ".animenotify now"));
    }
    const res = await runCheck({ force: true, chatId: m.chat }).catch((e) => ({ err: e }));
    if (res?.err) return m.reply(raraError(pluginConfig.name, "gagal ambil data: " + res.err.message));
    await m.react("🐣");
    return m.reply(raraSuccess(pluginConfig.name, "semua tipe konten aktif (anime baru/episode/terbaru/hangat/berita/video) dikirim di atas"));
  }

  if (sub === "anime") {
    await m.react("🕒");
    try {
      const res = await previewWatchlist(m.chat);
      await m.react("🐣");
      return m.reply(raraSuccess(pluginConfig.name, `daftar ${res.count} anime terbaru dikirim di atas — sumber ${res.source}`));
    } catch (e) {
      return m.reply(raraError(pluginConfig.name, "sumber anime lagi sibuk — coba lagi sebentar lagi"));
    }
  }

  if (sub === "genre") {
    const action = String(args?.[1] || "").toLowerCase();
    if (action === "add") {
      const g = (args?.slice(2).join(" ") || "").trim();
      if (!g) return m.reply(raraGuide(pluginConfig.name, "nama genre wajib — contoh genre populer: Action, Adventure, Comedy, Drama, Fantasy, Horror, Mystery, Romance, Sci-Fi, Sports, Supernatural, Isekai", ".animenotify genre add Sports"));
      const r = addGenre(g);
      if (!r.ok) return m.reply(raraError(pluginConfig.name, r.dup ? `genre "${g}" udah ada di daftar` : "nama genre kosong"));
      return m.reply(raraSuccess(pluginConfig.name, `genre "${g}" ditambah — sekarang ${r.genres.length} genre dipantau: ${r.genres.join(", ")}`));
    }
    if (action === "del" || action === "remove") {
      const g = (args?.slice(2).join(" ") || "").trim();
      const r = removeGenre(g);
      if (!r.ok) return m.reply(raraError(pluginConfig.name, `genre "${g}" gak ada di daftar`));
      return m.reply(raraSuccess(pluginConfig.name, `genre "${g}" dihapus — sisa ${r.genres.length} genre: ${r.genres.join(", ")}`));
    }
    const genres = getGenres();
    return m.reply(
      `「 ✦ GENRE DIPANTAU ✦ 」\n` +
      `🎭 ${genres.length} genre favorit yang dipantau notifier V2:\n\n` +
      genres.map((g, i) => `${i + 1}. ${g}`).join("\n") +
      `\n\nUbah: .animenotify genre add <genre> / genre del <genre>\n` +
      `Genre baru berlaku di cek AniList berikutnya (Kitsu gak filter genre)`
    );
  }

  if (sub === "season") {
    await m.react("🕒");
    try {
      const season = await getSeasonPreview(10);
      if (!season.list.length) return m.reply(raraError(pluginConfig.name, "data seasonal kosong"));
      await m.react("🐣");
      return m.reply(formatSeasonMessage(season));
    } catch (e) {
      return m.reply(raraError(pluginConfig.name, "Jikan/MAL lagi sibuk — coba lagi sebentar lagi"));
    }
  }

  return m.reply(
    raraGuide(
      pluginConfig.name,
      "auto notifikasi ANIME BARU + EPISODE BARU (AniList → Kitsu) — dikirim tiap 30 menit ke chat langganan",
      ".animenotify on — langganan chat ini\n.animenotify off — berhenti\n.animenotify status — lihat status\n.animenotify now — paksa kirim watchlist terkini\n.animenotify anime — daftar anime terbaru\n.animenotify genre — genre dipantau (add/del)\n.animenotify season — preview seasonal MAL\n.carianime <judul> — cari anime manual",
      "pause/resume global: .switch auto autoanimenotifier on/off (owner)",
    ),
  );
}

// ── KONVENSI SIGNATURE (dispatcher manggil handler(m, {sock, ...})) ──
export { pluginConfig as config, handler };
export default { config: pluginConfig, handler };
