// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// footballschedulenotify.js — Auto Jadwal Bola Notifier (request owner 10 Sep 2026,
// "mirip kerja anime notifier"). Sumber: ESPN scoreboard (utama, no key)
// → TheSportsDB (fallback). Per-chat opt-in:
//   • .jadwalbolanotify on/off  — langganan / berhenti di chat ini
//   • .jadwalbolanotify status   — status langganan + global
//   • .jadwalbolanotify now     — paksa kirim jadwal hari ini ke chat ini
//   • .jadwalbolanotify liga    — liga favorit add/del/list/reset
//   • .jadwalbolanotify info    — tipe konten (jadwal/reminder/hasil/live) on/off
//   • .jadwalbolanotify skor    — skor laga yang LAGI BERJALAN sekarang
//   • .jadwalbolanotify liveinterval <menit> — kecepatan polling gol (1-30)
//   • .jadwalbolanotify interval <menit>
// Toggle GLOBAL (pause/resume polling): .switch auto autobolanotify on/off

import {
  addTarget, removeTarget, isTarget, getStatus, isEnabled, runCheck,
  setSock, syncMonitor, getLeagues, addLeague, removeLeague, resetLeagues,
  getContentTypes, setContentType, BOLA_TYPES, LEAGUE_DB,
  setIntervalMenit, setApifyIntervalMenit, setLiveIntervalMenit, getLiveNow,
} from "../../src/lib/rara-auto-bola-notifier.js";
import { raraError, raraGuide, raraGuideV2, raraSuccess } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "jadwalbolanotify",
  alias: ["bolanotify", "jadwalnotify", "footballnotify", "bolaai"],
  category: "info",
  description: "Auto notifikasi jadwal bola (ESPN → TheSportsDB) — langganan per-chat",
  usage: ".jadwalbolanotify <on/off/status/now/skor/liga/info/interval/liveinterval/apify>",
  example: ".jadwalbolanotify on\n.jadwalbolanotify liga list",
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
  if (sock) setSock(sock);

  if (sub === "on") {
    await m.react("🕒");
    const chatId = m.chat;
    if (isTarget(chatId)) return m.reply(raraSuccess(pluginConfig.name, "chat ini udah langganan jadwal bola notifier"));
    addTarget(chatId);
    syncMonitor();
    if (!isEnabled()) {
      return m.reply(
        raraSuccess(pluginConfig.name, "chat ini terdaftar — tapi fitur auto masih OFF global, owner bisa nyalain via .switch auto autobolanotify on"),
      );
    }
    // salinan digest langsung ke chat ini sebagai sambutan (force+chatId)
    const res = await runCheck({ force: true, chatId }).catch((e) => ({ err: e }));
    if (res?.err) return m.reply(raraError(pluginConfig.name, "gagal ambil data: " + res.err.message));
    await m.react("🐣");
    return m.reply(raraSuccess(pluginConfig.name,
      res?.todays ? `aktif di chat ini — jadwal ${res.todays} laga hari ini dikirim di atas` : "aktif di chat ini — lagi gak ada laga hari ini, digest masuk begitu ada pertandingan"));
  }

  if (sub === "off") {
    removeTarget(m.chat);
    return m.reply(raraSuccess(pluginConfig.name, "chat ini berhenti langganan jadwal bola notifier"));
  }

  if (sub === "status") {
    const st = getStatus();
    const leagues = getLeagues();
    const lines = [
      `Langganan chat ini: ${isTarget(m.chat) ? "AKTIF" : "BELUM"}`,
      `Fitur global: ${st.enabled ? "ON" : "OFF"} (.switch auto autobolanotify)`,
      `Monitor: ${st.running ? "JALAN" : "STOP"}`,
      `Total subscriber: ${st.targets.length} chat`,
      `Interval: tiap ${st.intervalMenit} menit`,
      `Live ticker (gol): ${st.liveTipe ? "AKTIF" : "MATI"} — cek tiap ${st.liveIntervalMenit} mnt, ${st.liveTracked} laga terlacak`,
      `Liga dipantau: ${leagues.map((l) => l.label).join(", ")}`,
      `Tipe aktif: ${Object.entries(getContentTypes()).filter(([, on]) => on !== false).map(([k]) => k).join(", ")}`,
      `Sumber: ESPN → TheSportsDB (+ Flashscore/Apify buat Liga 2 — token: ${st.apifyToken ? "ADA" : "BELUM SET"})`,
      `Cek terakhir: ${st.lastCheck ? new Date(st.lastCheck).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "belum pernah"} (${st.lastSource || "-"})`,
      `Apify Liga 2: tiap ${st.apifyIntervalMenit} mnt (cek terakhir ${st.lastApifyCheck ? new Date(st.lastApifyCheck).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" }) : "-"}) — .jadwalbolanotify apify`,
    ];
    return m.reply(`「 ✦ ${pluginConfig.name.toUpperCase()} ✦ 」\n` + lines.join("\n"));
  }

  if (sub === "info" || sub === "tipe" || sub === "opsi") {
    const tipe = String(args?.[1] || "").toLowerCase();
    const onOff = String(args?.[2] || "").toLowerCase();
    const types = getContentTypes();

    if (!tipe || !["on", "off", "aktif", "mati"].includes(onOff)) {
      const lines = Object.entries(BOLA_TYPES).map(([key, t]) => {
        const on = types[key] !== false;
        return `${on ? "🟢" : "🔴"} *${key}* ${t.emoji} — ${t.desc}\n   ${on ? "ON" : "OFF"} · atur: .jadwalbolanotify info ${key} ${on ? "off" : "on"}`;
      });
      return m.reply(
        `「 ✦ ${pluginConfig.name.toUpperCase()} — TIPE KONTEN ✦ 」\n\n` +
        lines.join("\n\n") +
        `\n\n💡 Aktif/mati semua: .jadwalbolanotify info semua on|off` +
        `\n💡 Kirim ulang jadwal hari ini: .jadwalbolanotify now`
      );
    }

    if (tipe === "semua" || tipe === "all") {
      const action = onOff === "on" || onOff === "aktif";
      for (const k of Object.keys(BOLA_TYPES)) setContentType(k, action);
      return m.reply(raraSuccess(pluginConfig.name, `SEMUA tipe konten sekarang ${action ? "AKTIF" : "MATI"}`));
    }

    const action = onOff === "on" || onOff === "aktif";
    const res = setContentType(tipe, action);
    if (!res) return m.reply(raraError(pluginConfig.name, `tipe gak dikenal: ${tipe} — ketik .jadwalbolanotify info buat daftar tipe`));
    return m.reply(raraSuccess(pluginConfig.name, `tipe *${tipe}* sekarang ${action ? "AKTIF" : "MATI"} — notifikasi terkait ${action ? "bakal masuk" : "gak bakal dikirim"}`));
  }

  if (sub === "liga" || sub === "league") {
    const action = String(args?.[1] || "").toLowerCase();
    if (action === "list" || !action) {
      const leagues = getLeagues();
      const avail = Object.entries(LEAGUE_DB).filter(([slug]) => !leagues.some((l) => l.slug === slug));
      return m.reply(
        `「 ✦ LIGA DIPANTAU ✦ 」\n\n⚽ ${leagues.length} liga favorit yang dipantau notifier:\n\n` +
        leagues.map((l, i) => `${i + 1}. ${l.emoji} ${l.label} (${l.slug})`).join("\n") +
        (avail.length ? `\n\n📋 Liga lain yang tersedia:\n` + avail.map(([slug, l]) => `• ${l.emoji} ${l.label} (${slug})`).join("\n") : "") +
        `\n\nUbah: .jadwalbolanotify liga add <liga> / liga del <liga> / liga reset`
      );
    }
    if (action === "add") {
      const g = (args?.slice(2).join(" ") || "").trim();
      if (!g) return m.reply(raraGuide(pluginConfig.name, "nama/slug liga wajib — contoh: Liga Belanda / ned.1 / champions", ".jadwalbolanotify liga add Liga Belanda"));
      const r = addLeague(g);
      if (!r.ok) return m.reply(raraError(pluginConfig.name, r.error === "dup" ? `liga "${g}" udah ada di daftar` : `liga "${g}" gak dikenal — ketik .jadwalbolanotify liga list buat lihat yang tersedia, atau pakai slug ESPN (mis. ned.1)`));
      return m.reply(raraSuccess(pluginConfig.name, `liga *${r.label}* ditambah — sekarang ${r.leagues.length} liga dipantau`));
    }
    if (action === "del" || action === "remove") {
      const g = (args?.slice(2).join(" ") || "").trim();
      const r = removeLeague(g);
      if (!r.ok) return m.reply(raraError(pluginConfig.name, r.error === "last" ? "minimal 1 liga harus tetap dipantau" : r.error === "missing" ? `liga "${g}" gak ada di daftar` : "gagal"));
      return m.reply(raraSuccess(pluginConfig.name, `liga dihapus — sisa ${r.leagues.length} liga dipantau`));
    }
    if (action === "reset") {
      const leagues = resetLeagues();
      return m.reply(raraSuccess(pluginConfig.name, `liga favorit direset ke default ${leagues.length} liga: ${leagues.map((s) => LEAGUE_DB[s]?.label || s).join(", ")}`));
    }
    return m.reply(raraGuide(pluginConfig.name, "opsi liga: list / add <liga> / del <liga> / reset", ".jadwalbolanotify liga add Liga Belanda"));
  }

  if (sub === "interval" || sub === "jadwal") {
    const val = Number(args?.[1]);
    const st = getStatus();
    if (!val) {
      return m.reply(raraGuideV2(pluginConfig.name, {
        kaomoji: "(•̀ᴗ•́)و",
        sapaan: `interval cek sekarang tiap ${st.intervalMenit} menit — mau diatur?`,
        cara: "ketik .jadwalbolanotify interval <menit> (5–720)",
        contoh: ".jadwalbolanotify interval 15",
        note: "jadwal hari ini dicek berulang biar perubahan jam kickoff kekirim juga",
      }));
    }
    const res = setIntervalMenit(val);
    if (!res) return m.reply(raraError(pluginConfig.name, "interval harus 5–720 menit (contoh: .jadwalbolanotify interval 15)"));
    return m.reply(raraSuccess(pluginConfig.name, `interval cek sekarang *tiap ${res} menit* — monitor di-restart`));
  }

  if (sub === "apify" || sub === "flashscore") {
    const st = getStatus();
    const val = Number(args?.[1]);
    if (val) {
      const res = setApifyIntervalMenit(val);
      if (!res) return m.reply(raraError(pluginConfig.name, "interval Apify harus 15–720 menit — jaga credit free Apify $5/bln (biaya $0.003/match record)"));
      return m.reply(raraSuccess(pluginConfig.name, `interval cek Apify (Liga 2 via Flashscore) sekarang *tiap ${res} menit*`));
    }
    return m.reply(raraGuideV2(pluginConfig.name, {
      kaomoji: "(•̀ᴗ•́)و",
      sapaan: "apify flashscore buat liga 2 indonesia — cek kondisinya dulu ya",
      cara: `ketik .jadwalbolanotify apify <menit> (15–720)${st.apifyToken ? "" : " — token BELUM diset (env APIFY_TOKEN / apikeys.json apifyToken)"}`,
      contoh: ".jadwalbolanotify apify 120",
      note: `interval sekarang tiap ${st.apifyIntervalMenit} menit (window 07:00–24:00 WIB) — biaya $0.003/match record, default 120 mnt biar credit free $5/bulan aman`,
    }));
  }

  // SKOR BERJALAN — cek live manual, gak perlu langganan (ala .jadwalbola)
  if (sub === "skor" || sub === "live" || sub === "livescore") {
    await m.react("🔍");
    const live = await getLiveNow().catch(() => null);
    if (!live) return m.reply(raraError(pluginConfig.name, "gagal ambil data ESPN — coba lagi bentar"));
    if (!live.length) {
      await m.react("🐣");
      return m.reply(raraSuccess(pluginConfig.name, "gak ada laga yang lagi berjalan sekarang di liga yang dipantau — cek .jadwalbola buat jadwal"));
    }
    const by = {};
    for (const m2 of live) (by[m2.leagueLabel] = by[m2.leagueLabel] || []).push(m2);
    let txt = "🔴 *SKOR BERJALAN SEKARANG*\n";
    for (const [label, list] of Object.entries(by)) {
      txt += `\n${list[0].emoji} *${label.toUpperCase()}*\n`;
      for (const m2 of list) {
        txt += `• ${m2.home} *${m2.homeScore ?? 0} - ${m2.awayScore ?? 0}* ${m2.away} — ${m2.statusDetail || "berjalan"}\n`;
      }
    }
    txt += "\n💡 aktifkan tipe live (kick-off + gol real-time): .jadwalbolanotify info live on";
    await sock.sendMessage(m.chat, {
      text: txt,
      contextInfo: {
        externalAdReply: {
          title: "LIVE SCORE",
          body: "rara bola notifier • skor realtime ESPN",
          sourceUrl: "https://www.espn.com/soccer/",
          mediaType: 1,
          renderLargerThumbnail: true,
          showAdAttribution: false,
        },
      },
    });
    await m.react("🐣");
    return;
  }

  // interval live ticker (gol real-time)
  if (sub === "liveinterval" || sub === "golinterval") {
    const val = Number(args?.[1]);
    const st = getStatus();
    if (!val) {
      return m.reply(raraGuideV2(pluginConfig.name, {
        kaomoji: "(•̀ᴗ•́)و",
        sapaan: `ticker gol cek skor tiap ${st.liveIntervalMenit} menit (tipe live: ${st.liveTipe ? "AKTIF" : "MATI"}, ${st.liveTracked} laga terlacak)`,
        cara: "ketik .jadwalbolanotify liveinterval <menit> (1–30)",
        contoh: ".jadwalbolanotify liveinterval 2",
        note: "makin kecil interval makin cepet gol kekirim",
      }));
    }
    const res = setLiveIntervalMenit(val);
    if (!res) return m.reply(raraError(pluginConfig.name, "interval live harus 1–30 menit (contoh: .jadwalbolanotify liveinterval 2)"));
    return m.reply(raraSuccess(pluginConfig.name, `ticker gol sekarang cek *tiap ${res} menit* — makin kecil makin cepat gol kekirim`));
  }

  if (sub === "now") {
    await m.react("🕒");
    if (!isTarget(m.chat)) return m.reply(raraGuide(pluginConfig.name, "chat ini belum langganan — ketik .jadwalbolanotify on dulu", ".jadwalbolanotify now"));
    const res = await runCheck({ force: true, chatId: m.chat }).catch((e) => ({ err: e }));
    if (res?.err) return m.reply(raraError(pluginConfig.name, "gagal ambil data: " + res.err.message));
    await m.react("🐣");
    return m.reply(raraSuccess(pluginConfig.name, res?.todays ? `jadwal ${res.todays} laga hari ini dikirim di atas` : "gak ada laga hari ini di liga yang dipantau"));
  }

  return m.reply(
    raraGuide(
      pluginConfig.name,
      "auto notifikasi JADWAL BOLA (ESPN → TheSportsDB) — jadwal harian, reminder kick-off & skor full-time ke chat langganan",
      ".jadwalbolanotify on — langganan chat ini\n.jadwalbolanotify off — berhenti\n.jadwalbolanotify status — lihat status\n.jadwalbolanotify now — kirim jadwal hari ini\n.jadwalbolanotify skor — skor laga yang lagi berjalan (live)\n.jadwalbolanotify liga — liga favorit (add/del/list/reset)\n.jadwalbolanotify info — tipe konten (jadwal/reminder/hasil/live)\n.jadwalbolanotify interval <menit>\n.jadwalbolanotify liveinterval <menit> — kecepatan deteksi gol\n.jadwalbolanotify apify <menit> — Liga 2 via Flashscore\n.jadwalbola — jadwal manual (existing)",
      "pause/resume global: .switch auto autobolanotify on/off (owner)",
    ),
  );
}

// ── KONVENSI SIGNATURE (dispatcher manggil handler(m, {sock, ...})) ──
export { pluginConfig as config, handler };
export default { config: pluginConfig, handler };
