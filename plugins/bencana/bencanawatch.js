// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// bencanawatch.js — Langganan auto-alert bencana (opt-in, default OFF)
//   • Gempa Indonesia baru M >= 5.0 (BMKG)   — poll 60 dtk
//   • Gempa global baru M >= 6.0 (USGS)      — poll 5 mnt
//   • Bencana GDACS baru level SIAGA/AWAS    — poll 5 mnt
// Monitor lazy: timer cuma jalan kalau ada >= 1 subscriber.
//
// Scope langganan (request owner 2026-09-06):
//   • .bencanawatch on di DM → pilihan: chat ini / per grup target / GLOBAL (DM + semua grup)
//   • .bencanawatch on di dalam grup → aktif di grup itu (perilaku lama)
//   • Filter jenis/sumber/mode/lokasi/radius/jadwal yang di-set dari DM
//     otomatis diterapkan juga ke langganan global owner.

import {
  addWatcher, removeWatcher, getWatchersSafe, syncBencanaMonitor, watcherCount,
  setWatcherLocation, clearWatcherLocation, setWatcherRadius, haversineKm,
  setWatcherMode, addWatcherSchedule, removeWatcherSchedule, clearWatcherSchedules,
  setWatcherJenis, BENCANA_JENIS, setWatcherSumber, BENCANA_SUMBER,
  setWatcherKirim,
  addGlobalWatcher, removeGlobalWatcher, hasGlobalWatcher, globalWatcherKey,
  getMonitorHealth, sendActivationSample,
} from "../../src/lib/nova-bencana.js";
// ── GUARD FORMAT (request owner 2026-09-07): SEMUA pesan berkotak plugin
// ini WAJIB lewat boxLeft() dari src/lib/styler.js — kalimat input tetap
// ditulis utuh panjang di kode (gak usah dipendekkan manual), output
// dijamin ≤30 char/baris & tiap baris diawali "│ ", dikirim dalam code
// block supaya border rata. DILARANG nulis "│ " manual di file ini.
// Adapter di bawah nyanding API lama (novaBox/novaError/novaGuide) ke
// guard baru, jadi SEMUA call site otomatis lewat boxLeft.
import { boxMessage } from "../../src/lib/styler.js";

function toGuardedBox(header, lines = []) {
  const body = [];
  for (const l of lines) {
    if (l === "---" || l === "─") { body.push("────────────────"); continue; } // separator pendek ≤ width
    if (typeof l === "object" && l.sub) { body.push(`◆ ${String(l.sub).toUpperCase()} ◆`); continue; }
    if (!l || !String(l).trim()) continue; // baris kosong dibuang — guard gak butuh
    body.push(String(l));
  }
  // Judul dinormalkan pendek biar header gak kepanjangan
  const title = `◆ ${String(header).split("—")[0].trim().toUpperCase()} ◆`;
  return boxMessage(title, body.join("\n"));
}

const novaBox = (header, lines = []) => toGuardedBox(header, lines);
const novaError = (header, msg) => toGuardedBox(header, ["❌ " + (msg || "Terjadi error, coba lagi.")]);
const novaGuide = (header, intro, example) =>
  toGuardedBox(header, [
    ...(intro ? [String(intro)] : []),
    ...(example ? [`Contoh: ${example}`] : []),
  ]);

const pluginConfig = {
  name: "bencanawatch",
  alias: ["bencanawatch"],
  category: "bencana",
  description: "Langganan auto-alert bencana realtime — per chat, per grup target, atau global DM + semua grup",
  usage: ".bencanawatch <on/onchat/onglobal/offglobal/off/status/mode/jadwal/jenis/sumber/lokasi/radius/pilihgrup>",
  example: ".bencanawatch on",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const args = (m.args || []).map((a) => String(a).toLowerCase());
    // ── FIX OWNER 2026-09-07: toleransi salah ketik command umum ──
    // Report owner ngetik ".bencanawatch global" (maksudnya onglobal) dan
    // malah kena guide gak jelas. Alias ini bikin varian natural tetap
    // kena action yang benar tanpa perlu hafal nama exact.
    const ACTION_ALIAS = {
      global: "onglobal", matikanglobal: "offglobal", stopglobal: "offglobal",
      dm: "onchat", chat: "onchat", pribadi: "onchat",
      matikan: "off", stop: "off", nonaktif: "off", batal: "off",
      aktif: "on", aktifkan: "on", nyalakan: "on", cek: "status", check: "status",
      info: "status", help: "guide", bantuan: "guide",
      atur: "atur", pengaturan: "atur", setting: "atur", settings: "atur",
    };
    const action = ACTION_ALIAS[args[0]] || args[0] || "";
    const chatId = m.chat;
    const isDm = !String(m.chat || "").endsWith("@g.us");

    // ── FIX BUG owner 2026-09-07: setter (mode/jenis/sumber/radius/jadwal/
    // kirim/lokasi) selalu nyari subs[chatId] duluan. Tapi ".bencanawatch
    // onglobal" nyimpen langganan di key BEDA ("global:<ownerJid>"), BUKAN
    // di chatId — walau di DM chatId kebetulan == ownerJid. Akibatnya user
    // yang CUMA punya langganan GLOBAL (belum pernah onchat) selalu kena
    // "Aktifkan dulu .bencanawatch on." walau onglobal-nya udah aktif.
    // Fix: kalau di DM dan belum ada langganan per-chat TAPI global-nya
    // aktif, semua setter di bawah diarahin langsung ke key global itu.
    const subsSnapshotForKey = await getWatchersSafe();
    const hasChatSub = !!subsSnapshotForKey[chatId];
    const globalRecForSender = isDm ? hasGlobalWatcher(m.sender) : null;
    const targetKey = (!hasChatSub && globalRecForSender) ? globalWatcherKey(m.sender) : chatId;

    // Terapkan setter yang sama ke langganan global owner (kalau ada & command dari DM,
    // dan targetKey BUKAN udah global itu sendiri — biar gak nulis dobel ke key yang sama).
    const mirrorGlobal = async (fn) => {
      if (!isDm || !globalRecForSender) return false;
      if (targetKey === globalWatcherKey(m.sender)) return false;
      try { await fn(globalWatcherKey(m.sender)); } catch { /* global tetap default */ }
      return true;
    };

    // ── UX SIMPEL (request owner 2026-09-07: opsi & petunjuk gampang) ──
    // Semua pengaturan bisa diatur via popup tombol .bencanawatch atur,
    // dan tiap setting tanpa nilai otomatis kasih tombol pilihan cepat —
    // user gak perlu hafal command manual.
    const quick = (display_text, id) =>
      ({ name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text, id }) });
    const replyWithButtons = async (text, buttons) => {
      try {
        await sock.sendButton(m.chat, null, text, m, { buttons });
        return { handled: true };
      } catch { return m.reply(text); }
    };

    // ── POPUP SEMUA PENGATURAN: 1 tombol buat semua opsi ──
    if (action === "atur" || action === "pengaturan" || action === "setting") {
      const subs0 = await getWatchersSafe();
      const me0 = subs0[targetKey];
      const fJenis = Array.isArray(me0?.jenis) && me0.jenis.length ? me0.jenis.join(", ") : "semua";
      const fSumber = Array.isArray(me0?.sumber) && me0.sumber.length ? me0.sumber.join(", ").toUpperCase() : "semua";
      const fJadwal = Array.isArray(me0?.schedules) && me0.schedules.length ? me0.schedules.join(", ") : "belum ada";
      const rows = [
        { title: "Mode Pengiriman", description: `Aktif: ${(me0?.mode || "otomatis").toUpperCase()} — kapan alert dikirim`, id: ".bencanawatch mode" },
        { title: "Sumber Berita", description: `Aktif: ${fSumber} — BMKG / USGS / GDACS`, id: ".bencanawatch sumber" },
        { title: "Jenis Bencana", description: `Aktif: ${fJenis} — gempa, banjir, dll`, id: ".bencanawatch jenis" },
        { title: "Kepadatan Kirim", description: `Aktif: ${(me0?.kirim || "utama").toUpperCase()} — 1 info terpenting / semua`, id: ".bencanawatch kirim" },
        { title: "Lokasi & Radius", description: me0?.city ? `Aktif: ${me0.city} (${me0.radius || 300} km)` : "Belum di-set — buat peringatan wilayah", id: ".bencanawatch lokasi" },
        { title: "Jadwal Rangkuman", description: `Aktif: ${fJadwal} — khusus mode jadwal`, id: ".bencanawatch jadwal" },
        { title: "Status Lengkap", description: "Cek semua pengaturan + kesehatan monitor", id: ".bencanawatch status" },
      ];
      const text = novaBox("Bencana Watch — Atur", [
        "Semua pengaturan ada di satu popup.",
        "Pilih yang mau diubah — tiap pilihan",
        "kasih penjelasan + tombol cepat lagi.",
        "---",
        "Atau ketik manual, contoh:",
        ".bencanawatch mode darurat",
      ]);
      try {
        await sock.sendButton(m.chat, null, text, m, {
          buttons: [
            { name: "single_select", buttonParamsJson: JSON.stringify({ title: "Pilih Pengaturan", sections: [{ title: "Pengaturan Bencana Watch", rows }] }) },
          ],
        });
      } catch {
        await m.reply(text + "\n\n" + rows.map((r) => `• ${r.title} → ${r.id}`).join("\n"));
      }
      return { handled: true };
    }

    // ── set lokasi (buat peringatan wilayah) ──
    if (action === "lokasi" || action === "setlokasi" || action === "loc") {
      const place = (m.args || []).slice(1).join(" ").trim();
      if (!place) {
        return m.reply(novaBox("Bencana Watch", [
          "Set lokasi buat peringatan khusus wilayah.",
          "Bot kasih tahu kalau ada bencana baru DEKAT lokasi kamu.",
          "---",
          `Contoh : .bencanawatch lokasi Palu`,
          `Contoh : .bencanawatch lokasi Kota Malang, Jawa Timur`,
          `Hapus   : .bencanawatch lokasi hapus`,
        ]));
      }
      if (place.toLowerCase() === "hapus" || place.toLowerCase() === "delete") {
        clearWatcherLocation(targetKey);
        const alsoG = await mirrorGlobal((k) => clearWatcherLocation(k));
        await m.react("🐣");
        return m.reply(novaBox("Bencana Watch", [
          "Lokasi dihapus. Peringatan wilayah mati, alert umum tetap jalan.",
          ...(alsoG ? ["Lokasi langganan global ikut dihapus."] : []),
        ]));
      }
      try {
        const rec = await setWatcherLocation(targetKey, place);
        const alsoG = await mirrorGlobal((k) => setWatcherLocation(k, place));
        await m.react("🐣");
        return m.reply(novaBox("Bencana Watch", [
          `Lokasi tersimpan.`,
          `Kota    : ${rec.city}`,
          `Detail  : ${rec.detail || "-"}`,
          `Koordinat : ${rec.lat.toFixed(3)}, ${rec.lon.toFixed(3)}`,
          "---",
          "Peringatan wilayah aktif kalau bencana baru masuk",
          `radius monitoring (default 300 km). Atur: .bencanawatch radius 500`,
          ...(alsoG ? ["Lokasi diterapkan juga ke langganan global."] : []),
        ]));
      } catch (e) {
        await m.react("❌");
        return m.reply(novaError("Bencana Watch", e.message));
      }
    }

    // ── set radius monitoring ──
    if (action === "radius" || action === "jarak") {
      const rawKm0 = (m.args || [])[1];
      if (!rawKm0) {
        const subs0 = await getWatchersSafe();
        const me0 = subs0[targetKey];
        return m.reply(novaBox("Bencana Watch — Radius", [
          me0?.city
            ? `Radius aktif : ${me0.radius || 300} km dari ${me0.city}`
            : "Lokasi belum di-set.",
          "---",
          "Radius = jarak maksimum bencana dari",
          "lokasi kamu yang dihitung 'dekat' (dikirim",
          "sebagai peringatan wilayah).",
          "---",
          me0?.city ? "Contoh : .bencanawatch radius 500" : "Set lokasi dulu: .bencanawatch lokasi Palu",
          "Rentang : 50 - 2000 km (default 300)",
        ]));
      }
      try {
        const rawKm = (m.args || [])[1];
        const rec = setWatcherRadius(targetKey, rawKm);
        const alsoG = await mirrorGlobal((k) => setWatcherRadius(k, rawKm));
        await m.react("🐣");
        return m.reply(novaBox("Bencana Watch", [
          `Radius monitoring: ${rec.radius} km dari ${rec.city || "lokasi kamu"}.`,
          "Bencana baru dalam radius ini → peringatan wilayah.",
          ...(alsoG ? ["Radius langganan global ikut diubah."] : []),
        ]));
      } catch (e) {
        await m.react("❌");
        return m.reply(novaError("Bencana Watch", e.message || "Radius harus 50-2000 km. Contoh: .bencanawatch radius 500"));
      }
    }

    // ── kepadatan alert: utama (1 info per pembaruan) / semua (cooldown) ──
    if (action === "kirim" || action === "kepadatan") {
      const v = (m.args || [])[1]?.toLowerCase();
      if (!v) {
        const subs0 = await getWatchersSafe();
        const cur = subs0[targetKey]?.kirim || "utama";
        const text = novaBox("Bencana Watch — Kirim", [
          `Kirim aktif : ${cur.toUpperCase()}`,
          "---",
          "• UTAMA — tiap pembaruan cuma 1 info",
          "  TERPENTING. Anti-spam (default).",
          "• SEMUA — semua info dikirim, tapi",
          "  ada jeda 10 menit biar gak banjir.",
          "---",
          "Ketik manual: .bencanawatch kirim utama",
        ]);
        return replyWithButtons(text, [
          quick("Utama — Anti Spam (Default)", ".bencanawatch kirim utama"),
          quick("Semua — Ada Jeda 10 Mnt", ".bencanawatch kirim semua"),
        ]);
      }
      try {
        const rec = setWatcherKirim(targetKey, v);
        const alsoG = await mirrorGlobal((k) => setWatcherKirim(k, v));
        await m.react("🐣");
        return m.reply(novaBox("Bencana Watch", [
          `Mode kirim: ${rec.kirim.toUpperCase()}`,
          ...(alsoG ? ["Mode kirim langganan global ikut diubah."] : []),
          "---",
          rec.kirim === "utama"
            ? "Tiap pembaruan pusat cukup 1 info terpenting saja — tanpa spam."
            : "Semua info dikirim dengan jeda 10 menit per chat — tetap rapi.",
        ]));
      } catch (e) {
        await m.react("❌");
        return m.reply(novaError("Bencana Watch", e.message));
      }
    }

    // ── filter jenis bencana ──
    if (action === "jenis" || action === "filter") {
      const rest = (m.args || []).slice(1).join(" ").trim().toLowerCase();
      if (!rest) {
        const subs0 = await getWatchersSafe();
        const cur = subs0[targetKey]?.jenis;
        const text = novaBox("Bencana Watch — Jenis", [
          `Jenis aktif : ${Array.isArray(cur) && cur.length ? cur.join(", ") : "semua jenis"}`,
          "---",
          "Pilihan : " + BENCANA_JENIS.join(", "),
          "---",
          "Ketik manual: .bencanawatch jenis gempa",
        ]);
        return replyWithButtons(text, [
          quick("Semua Jenis — Default", ".bencanawatch jenis semua"),
          quick("Gempa Saja", ".bencanawatch jenis gempa"),
          quick("Gempa + Banjir", ".bencanawatch jenis gempa, banjir"),
        ]);
      }
      try {
        if (rest === "semua" || rest === "all" || rest === "reset") {
          setWatcherJenis(targetKey, []);
          const alsoG = await mirrorGlobal((k) => setWatcherJenis(k, []));
          await m.react("🐣");
          return m.reply(novaBox("Bencana Watch", [
            "Filter jenis direset — semua jenis bencana dikirim lagi.",
            ...(alsoG ? ["Filter langganan global ikut direset."] : []),
          ]));
        }
        const alias = {
          gempa: "gempa", earthquake: "gempa", eq: "gempa",
          banjir: "banjir", flood: "banjir",
          topan: "topan", badai: "topan", cyclone: "topan",
          gunungapi: "gunungapi", gunung: "gunungapi", volcano: "gunungapi",
          kebakaran: "kebakaran", karhutla: "kebakaran", fire: "kebakaran",
          kering: "kering", kekeringan: "kering", drought: "kering",
          tsunami: "tsunami",
        };
        const kinds = rest.split(/[\s,]+/).map((k) => alias[k]).filter(Boolean);
        const invalid = rest.split(/[\s,]+/).filter((k) => !alias[k]);
        if (invalid.length) throw new Error(`Jenis tidak dikenal: ${invalid.join(", ")}. Pilihan: ${BENCANA_JENIS.join(", ")}`);
        setWatcherJenis(targetKey, kinds);
        const alsoG = await mirrorGlobal((k) => setWatcherJenis(k, kinds));
        await m.react("🐣");
        return m.reply(novaBox("Bencana Watch", [
          `Filter jenis aktif: ${kinds.join(", ")}`,
          "---",
          "Hanya jenis di atas yang dikirim (semua mode).",
          "Reset: .bencanawatch jenis semua",
          ...(alsoG ? ["Filter diterapkan juga ke langganan global."] : []),
        ]));
      } catch (e) {
        await m.react("❌");
        return m.reply(novaError("Bencana Watch", e.message));
      }
    }

    // ── filter sumber (bmkg / usgs / gdacs) ──
    if (action === "sumber" || action === "source") {
      const rest = (m.args || []).slice(1).join(" ").trim().toLowerCase();
      if (!rest) {
        const subs0 = await getWatchersSafe();
        const cur = subs0[targetKey]?.sumber;
        const text = novaBox("Bencana Watch — Sumber", [
          `Sumber aktif : ${Array.isArray(cur) && cur.length ? cur.join(", ").toUpperCase() : "semua"}`,
          "---",
          "• BMKG — gempa Indonesia M 5.0+",
          "• USGS — gempa global M 6.0+",
          "• GDACS — bencana dunia SIAGA/AWAS",
          "---",
          "Ketik manual: .bencanawatch sumber bmkg",
        ]);
        return replyWithButtons(text, [
          quick("Semua Sumber — Default", ".bencanawatch sumber semua"),
          quick("Indonesia Saja — BMKG", ".bencanawatch sumber bmkg"),
          quick("BMKG + GDACS", ".bencanawatch sumber bmkg, gdacs"),
          quick("Internasional Saja", ".bencanawatch sumber usgs, gdacs"),
        ]);
      }
      try {
        if (rest === "semua" || rest === "all" || rest === "reset") {
          setWatcherSumber(targetKey, []);
          const alsoG = await mirrorGlobal((k) => setWatcherSumber(k, []));
          await m.react("🐣");
          return m.reply(novaBox("Bencana Watch", [
            "Filter sumber direset — semua sumber dikirim lagi.",
            ...(alsoG ? ["Filter langganan global ikut direset."] : []),
          ]));
        }
        const sources = [...new Set(rest.split(/[\s,]+/).filter(Boolean))];
        const bad = sources.filter((k) => !BENCANA_SUMBER.includes(k));
        if (bad.length) throw new Error(`Sumber tidak dikenal: ${bad.join(", ")}. Pilihan: ${BENCANA_SUMBER.join(", ")} (atau 'semua')`);
        setWatcherSumber(targetKey, sources);
        const alsoG = await mirrorGlobal((k) => setWatcherSumber(k, sources));
        await m.react("🐣");
        return m.reply(novaBox("Bencana Watch", [
          `Filter sumber aktif: ${sources.join(", ").toUpperCase()}`,
          "---",
          "Hanya alert dari sumber di atas yang dikirim",
          "(semua mode, realtime & rangkuman).",
          "Reset: .bencanawatch sumber semua",
          ...(alsoG ? ["Filter diterapkan juga ke langganan global."] : []),
        ]));
      } catch (e) {
        await m.react("❌");
        return m.reply(novaError("Bencana Watch", e.message));
      }
    }

    // ── mode pengiriman: otomatis / jadwal / darurat ──
    if (action === "mode") {
      const mode = (m.args || [])[1]?.toLowerCase();
      if (!mode) {
        const subs0 = await getWatchersSafe();
        const cur = (subs0[targetKey]?.mode || "otomatis").toUpperCase();
        const text = novaBox("Bencana Watch — Mode", [
          `Mode aktif : ${cur}`,
          "---",
          "• OTOMATIS — semua bencana baru langsung",
          "  dikirim (paling gampang, default)",
          "• JADWAL — dikumpulkan, dikirim rangkuman",
          "  di jam yang kamu pilih",
          "• DARURAT — cuma bencana dekat lokasi",
          "  kamu atau bencana besar",
          "---",
          "Ketik manual: .bencanawatch mode jadwal",
        ]);
        return replyWithButtons(text, [
          quick("Otomatis — Default", ".bencanawatch mode otomatis"),
          quick("Jadwal — Rangkuman", ".bencanawatch mode jadwal"),
          quick("Darurat — Penting Saja", ".bencanawatch mode darurat"),
        ]);
      }
      try {
        const rec = setWatcherMode(targetKey, mode);
        const alsoG = await mirrorGlobal((k) => setWatcherMode(k, mode));
        await m.react("🐣");
        const expl = {
          otomatis: "Semua bencana baru dikirim langsung. Dekat lokasi → peringatan wilayah, jauh → alert umum.",
          jadwal: "Bencana baru dikumpulkan & dikirim sebagai rangkuman di jam yang di-set. Set jam: .bencanawatch jadwal add 07:00. Bencana DARURAT besar tetap langsung dikirim realtime, gak nunggu rangkuman.",
          darurat: "Hanya bencana paling penting yang dikirim: dekat lokasi kamu (radius) atau bencana besar. Set lokasi dulu biar maksimal: .bencanawatch lokasi <kota>",
        };
        return m.reply(novaBox("Bencana Watch", [
          `Mode: ${rec.mode}`,
          ...(alsoG ? ["Mode langganan global ikut diubah."] : []),
          "---",
          expl[rec.mode],
        ]));
      } catch (e) {
        await m.react("❌");
        return m.reply(novaError("Bencana Watch", e.message));
      }
    }

    // ── jadwal rangkuman (mode jadwal) ──
    if (action === "jadwal" || action === "schedule") {
      const sub = (m.args || [])[1]?.toLowerCase() || "list";
      try {
        if (sub === "add" || sub === "tambah") {
          const hhmm = (m.args || [])[2];
          const rec = addWatcherSchedule(targetKey, hhmm);
          const alsoG = await mirrorGlobal((k) => addWatcherSchedule(k, hhmm));
          await m.react("🐣");
          return m.reply(novaBox("Bencana Watch", [
            `Jadwal ${rec.schedules.at(-1)} ditambah (mode jadwal aktif).`,
            `Total ${rec.schedules.length} jadwal: ${rec.schedules.join(", ")}`,
            "---",
            "Rangkuman bencana dikirim di jam-jam tersebut.",
            "Bisa tambah bebas: .bencanawatch jadwal add 13:00",
            ...(alsoG ? ["Jadwal langganan global ikut ditambah."] : []),
          ]));
        }
        if (sub === "remove" || sub === "hapus" || sub === "del") {
          const hhmm = (m.args || [])[2];
          const rec = removeWatcherSchedule(targetKey, hhmm);
          const alsoG = await mirrorGlobal((k) => removeWatcherSchedule(k, hhmm));
          await m.react("🐣");
          return m.reply(novaBox("Bencana Watch", [
            `Jadwal dihapus. Sisa: ${rec.schedules.length ? rec.schedules.join(", ") : "kosong"}`,
            ...(alsoG ? ["Jadwal langganan global ikut dihapus."] : []),
          ]));
        }
        if (sub === "clear" || sub === "reset") {
          clearWatcherSchedules(targetKey);
          const alsoG = await mirrorGlobal((k) => clearWatcherSchedules(k));
          await m.react("🐣");
          return m.reply(novaBox("Bencana Watch", [
            "Semua jadwal rangkuman dihapus.",
            ...(alsoG ? ["Jadwal langganan global ikut dihapus."] : []),
          ]));
        }
        // list / default
        const subs = await getWatchersSafe();
        const me = subs[targetKey];
        const scheds = Array.isArray(me?.schedules) ? me.schedules : [];
        const text = novaBox("Bencana Watch — Jadwal", [
          `Jadwal : ${scheds.length ? scheds.join(", ") : "belum ada"}`,
          `Mode   : ${me?.mode || "otomatis"}`,
          "---",
          "Rangkuman bencana dikirim di jam-jam ini",
          "(khusus mode JADWAL). Bencana besar tetap",
          "langsung dikirim realtime.",
          "---",
          "Manual : .bencanawatch jadwal add 07:00",
        ]);
        return replyWithButtons(text, [
          quick("Tambah 07:00 (Pagi)", ".bencanawatch jadwal add 07:00"),
          quick("Tambah 12:00 (Siang)", ".bencanawatch jadwal add 12:00"),
          quick("Tambah 18:00 (Sore)", ".bencanawatch jadwal add 18:00"),
          quick("Hapus Semua Jadwal", ".bencanawatch jadwal clear"),
        ]);
      } catch (e) {
        await m.react("❌");
        return m.reply(novaError("Bencana Watch", e.message));
      }
    }

    // ── aktifkan di chat ini saja (perilaku lama, bebas DM/grup) ──
    if (action === "onchat") {
      await addWatcher(chatId);
      syncBencanaMonitor(sock);
      await m.react("🐣");
      await m.reply(novaBox("Bencana Watch", [
        "Auto-alert bencana aktif di chat ini.",
        "---",
        "• Gempa Indonesia baru M 5.0+ (BMKG)",
        "• Gempa global baru M 6.0+ (USGS)",
        "• Bencana GDACS level SIAGA / AWAS",
        "---",
        "Sebentar lagi menyusul 1 contoh info",
        "TERKINI sebagai tanda fitur aktif.",
        "---",
        "MAU INDONESIA SAJA? Pilih sumbernya:",
        "• .bencanawatch sumber bmkg",
        "---",
        "Matikan dengan .bencanawatch off",
      ]));
      await sendActivationSample(sock, chatId); // bukti + preview format alert
      return { handled: true };
    }

    // ── scope global: DM owner + semua grup ──
    if (action === "onglobal") {
      await addGlobalWatcher(m.sender);
      syncBencanaMonitor(sock);
      await m.react("🐣");
      await m.reply(novaBox("Bencana Watch", [
        "Mode GLOBAL aktif — DM + semua grup.",
        "---",
        "Alert bencana realtime dikirim ke:",
        "• chat pribadi kamu (DM)",
        "• semua grup yang bot masuk",
        "---",
        "Sebentar lagi menyusul 1 contoh info",
        "TERKINI sebagai tanda fitur aktif.",
        "---",
        "Filter jenis / sumber / mode / lokasi / jadwal yang",
        "di-set dari DM berlaku juga ke langganan global.",
        "Matikan: .bencanawatch offglobal",
      ]));
      await sendActivationSample(sock, m.chat); // bukti + preview format alert
      return { handled: true };
    }

    if (action === "offglobal") {
      removeGlobalWatcher(m.sender);
      syncBencanaMonitor(sock);
      await m.react("🐣");
      return m.reply(novaBox("Bencana Watch", [
        "Langganan global dimatikan.",
        "Langganan per chat/grup yang lain tetap jalan.",
      ]));
    }

    // ── popup pilih grup target (dari DM) ──
    if (action === "pilihgrup" || action === "pilihgroup") {
      let groups = {};
      try { groups = (await sock.groupFetchAllParticipating()) || {}; } catch {}
      const list = Object.values(groups)
        .map((g) => ({ jid: g.id, subject: (g.subject || g.id || "").trim(), count: (g.participants || []).length }))
        .sort((a, b) => a.subject.localeCompare(b.subject));
      if (!list.length) {
        return m.reply(novaBox("Bencana Watch", [
          "Bot belum berada di grup mana pun,",
          "jadi belum ada target yang bisa dipilih.",
        ]));
      }
      const rowsOn = list.slice(0, 50).map((g) => ({
        title: g.subject.slice(0, 25),
        description: `${g.count} member — ON alert bencana di grup ini`,
        id: `.bencanawatch grup ${g.jid} on`,
      }));
      const rowsOff = list.slice(0, 50).map((g) => ({
        title: g.subject.slice(0, 25),
        description: `${g.count} member — OFF alert bencana di grup ini`,
        id: `.bencanawatch grup ${g.jid} off`,
      }));
      const text = novaBox("Bencana Watch", [
        `Fitur  : auto-alert bencana`,
        `Mode   : per grup target`,
        "---",
        `Total grup terdeteksi : ${list.length}`,
        "",
        "Pilih grup dari daftar popup untuk",
        "mengaktifkan atau menonaktifkan alert.",
      ]);
      try {
        await sock.sendButton(m.chat, null, text, m, {
          buttons: [
            {
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: "Pilih Grup",
                sections: [
                  { title: "Aktifkan (On)", rows: rowsOn },
                  { title: "Matikan (Off)", rows: rowsOff },
                ],
              }),
            },
          ],
        });
      } catch {
        await m.reply(text + `\n\nKetik .bencanawatch grup <id grup> on`);
      }
      return { handled: true };
    }

    // ── set on/off per grup target (dari popup / manual) ──
    if (action === "grup" || action === "group") {
      const target = String(args[1] || "");
      if (!target.endsWith("@g.us")) {
        return m.reply(novaError("Bencana Watch", `ID grup tidak valid. Gunakan .bencanawatch pilihgrup`));
      }
      const onoff = args[2] === "off" ? "off" : "on";
      if (onoff === "on") await addWatcher(target);
      else await removeWatcher(target);
      syncBencanaMonitor(sock);
      let subject = target;
      try { subject = (await sock.groupMetadata(target))?.subject || target; } catch {}
      await m.react("🐣");
      await m.reply(novaBox("Bencana Watch", [
        `Auto-alert bencana: ${onoff.toUpperCase()} di grup target.`,
        `Grup : ${subject}`,
        onoff === "on"
          ? "Alert bencana otomatis muncul di grup tersebut."
          : "Alert dihentikan di grup tersebut.",
      ]));
      if (onoff === "on") await sendActivationSample(sock, target); // bukti ke grup target
      return { handled: true };
    }

    if (action === "on") {
      // di dalam grup: langsung aktif di grup ini (perilaku lama)
      if (!isDm) {
        await addWatcher(chatId);
        syncBencanaMonitor(sock);
        await m.react("🐣");
        await m.reply(novaBox("Bencana Watch", [
          "Auto-alert bencana aktif di grup ini.",
          "---",
          "• Gempa Indonesia baru M 5.0+ (BMKG)",
          "• Gempa global baru M 6.0+ (USGS)",
          "• Bencana GDACS level SIAGA / AWAS",
          "---",
          "Sebentar lagi menyusul 1 contoh info",
          "TERKINI sebagai tanda fitur aktif.",
          "---",
          "MAU INDONESIA SAJA? Pilih sumbernya:",
          "• .bencanawatch sumber bmkg",
          "• .bencanawatch sumber bmkg, gdacs",
          "---",
          "Tips: set lokasi biar dapat peringatan khusus",
          "wilayah: .bencanawatch lokasi <nama kota>",
          "Matikan dengan .bencanawatch off",
        ]));
        await sendActivationSample(sock, chatId); // bukti + preview format alert
        return { handled: true };
      }
      // di DM: pilih scope — chat ini / per grup / global
      const g = hasGlobalWatcher(m.sender);
      const subs = await getWatchersSafe();
      const dmActive = !!subs[chatId];
      const text = novaBox("Bencana Watch — Pilih Mode", [
        `Fitur  : auto-alert bencana realtime`,
        `Lokasi : chat pribadi`,
        "---",
        "Pilih di mana alert mau dikirim:",
        "",
        `1. Chat ini (DM)      : ${dmActive ? "AKTIF" : "OFF"}`,
        "2. Per grup target      : pilih grup dari popup",
        `3. Global DM + grup   : ${g ? "AKTIF — DM + semua grup" : "OFF"}`,
        "---",
        "Filter jenis/sumber/mode/lokasi yang di-set",
        "dari DM berlaku juga ke langganan global.",
      ]);
      try {
        await sock.sendButton(m.chat, null, text, m, {
          buttons: [
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "On Di Chat Ini (DM)", id: ".bencanawatch onchat" }) },
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Pilih Grup Target", id: ".bencanawatch pilihgrup" }) },
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "On Global DM + Semua Grup", id: ".bencanawatch onglobal" }) },
          ],
        });
      } catch {
        await m.reply(text + "\n\nKetik .bencanawatch onchat / pilihgrup / onglobal");
      }
      return { handled: true };
    }

    if (action === "off") {
      await removeWatcher(chatId);
      syncBencanaMonitor(sock);
      await m.react("🐣");
      const lines = ["Auto-alert bencana dimatikan di chat ini."];
      if (isDm && hasGlobalWatcher(m.sender)) {
        lines.push("---", "Langganan GLOBAL masih aktif (DM + semua grup).", "Matikan dengan .bencanawatch offglobal");
      }
      return m.reply(novaBox("Bencana Watch", lines));
    }

    if (action === "status" || action === "") {
      const subs = await getWatchersSafe();
      const me = subs[targetKey];
      const active = me
        ? `AKTIF sejak ${me.since.slice(0, 10)}`
        : "TIDAK AKTIF di chat ini";
      const lines = [
        `Status  : ${active}`,
        `Total   : ${Object.keys(subs).length} langganan`,
        `Sumber  : ${Array.isArray(me?.sumber) && me.sumber.length ? me.sumber.join(", ").toUpperCase() + " (filter)" : "BMKG, USGS, GDACS"}`,
        `Mode    : ${me?.mode || "otomatis"}`,
        `Kirim   : ${me?.kirim || "utama"}${(me?.kirim || "utama") === "utama" ? " — 1 info terpenting per pembaruan" : " — semua info, cooldown 10 mnt"}`,
      ];
      if ((me?.mode || "otomatis") === "jadwal") {
        lines.push(`Jadwal  : ${(Array.isArray(me.schedules) && me.schedules.length) ? me.schedules.join(", ") : "belum ada — .bencanawatch jadwal add 07:00"}`);
      }
      if (Array.isArray(me?.jenis) && me.jenis.length) {
        lines.push(`Jenis   : ${me.jenis.join(", ")} (filter aktif)`);
      }
      if (isDm && hasGlobalWatcher(m.sender)) {
        lines.push(`Global  : AKTIF — DM + semua grup (off: .bencanawatch offglobal)`);
      }
      if (me?.city) {
        lines.push("---");
        lines.push(`Lokasi  : ${me.city}${me.detail ? ` (${me.detail})` : ""}`);
        lines.push(`Radius  : ${me.radius || 300} km — peringatan wilayah aktif`);
      } else if (me) {
        lines.push("---");
        lines.push("Lokasi  : belum di-set (alert umum saja)");
        lines.push("Set     : .bencanawatch lokasi <nama kota>");
      }
      if (!me && !(isDm && hasGlobalWatcher(m.sender))) lines.push("---", "Aktifkan dengan .bencanawatch on");

      // ── FIX OWNER 2026-09-07: kesehatan monitor — biar kelihatan jelas
      // kalau bot beneran mantau (bukan mati), report owner "aktifin tapi
      // gak masuk info bencananya" — cek monitor jalan/gak + kapan terakhir
      // cek tiap sumber, plus penegasan ini FITUR REALTIME (bencana BARU
      // sejak aktif), bukan daftar bencana yang lagi terjadi sekarang.
      const health = getMonitorHealth();
      lines.push("---");
      lines.push(`Monitor : ${health.running ? "HIDUP — sedang mantau" : "MATI (belum ada subscriber)"}`);
      lines.push(`Cek BMKG  : tiap ${health.pollBmkgSec}s${health.bmkgLastCheck ? `, terakhir ${new Date(health.bmkgLastCheck).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}` : ", belum pernah"}`);
      lines.push(`Cek Global: tiap ${health.pollGlobalSec}s (USGS + GDACS)`);
      lines.push("---");
      lines.push("PENTING: ini alert REALTIME — cuma kirim bencana BARU");
      lines.push("sejak diaktifkan, bukan daftar bencana yang lagi");
      lines.push("terjadi sekarang. Kalau belum ada kejadian baru yang");
      lines.push("cocok kriteria (gempa M5+/M6+, GDACS Siaga/Awas), ya");
      lines.push("emang belum ada pesan masuk — itu normal, bukan error.");
      lines.push(`Mau lihat kondisi TERKINI sekarang? Pakai: .bencana`);
      lines.push("---");
      lines.push("Semua pengaturan bisa diubah gampang");
      lines.push("lewat popup tombol: .bencanawatch atur");
      return m.reply(novaBox("Bencana Watch", lines));
    }

    // ── FIX OWNER 2026-09-07: guide jelas & terstruktur (bukan 1 paragraf
    // panjang smallcaps yang susah dibaca) — report owner "settingan ribet,
    // tolong guide-nya yang jelas cara aktifin opsi tertentu". ──
    if (action === "guide") {
      // Semua baris dijaga pendek biar gak kena wrap aneh.
      return replyWithButtons(novaBox("Bencana Watch — Guide", [
        "Semua command diawali .bencanawatch",
        "---",
        { sub: "Cara paling gampang" },
        "• atur → popup SEMUA pengaturan",
        "  (mode, sumber, jenis, lokasi, dll)",
        "---",
        { sub: "1. Aktifkan" },
        "• on → grup: aktif langsung",
        "        DM: muncul tombol pilihan",
        "• onglobal → DM + semua grup",
        "• off / offglobal → matikan",
        "---",
        { sub: "2. Atur selera (opsional)" },
        "• mode otomatis / jadwal / darurat",
        "• sumber bmkg (Indonesia saja)",
        "• jenis gempa (jenis tertentu)",
        "• lokasi Palu (peringatan wilayah)",
        "• radius 500 (jarak dari lokasi)",
        "• kirim utama (anti-spam)",
        "---",
        { sub: "3. Cek" },
        "• status → langganan + monitor",
        "---",
        "Catatan: alert REALTIME — cuma bencana",
        "BARU sejak aktif, bukan daftar bencana",
        "yang lagi terjadi (itu: .bencana).",
      ]), [
        quick("Buka Pengaturan", ".bencanawatch atur"),
        quick("Cek Status Saya", ".bencanawatch status"),
      ]);
    }

    return replyWithButtons(novaBox("Bencana Watch", [
      "Command gak dikenali.",
      "---",
      "• atur   → popup semua pengaturan",
      "• status → cek langganan kamu",
      "• guide  → cara pakai lengkap",
    ]), [
      quick("Pengaturan", ".bencanawatch atur"),
      quick("Status Saya", ".bencanawatch status"),
      quick("Cara Pakai", ".bencanawatch guide"),
    ]);
  } catch (err) {
    console.error("[bencanawatch]", err);
    await m.react("❌");
    return m.reply(novaError("Bencana Watch"));
  }
}

export { pluginConfig as config, handler };
