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
} from "../../src/lib/nova-bencana.js";
import { novaBox, novaError, novaGuide } from "../../src/lib/nova-menu-style.js";

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
    const action = args[0] || "";
    const chatId = m.chat;
    const isDm = !String(m.chat || "").endsWith("@g.us");

    // Terapkan setter yang sama ke langganan global owner (kalau ada & command dari DM).
    // Balikin true kalau ke-mirror, buat ditulis di reply.
    const mirrorGlobal = async (fn) => {
      if (!isDm || !hasGlobalWatcher(m.sender)) return false;
      try { await fn(globalWatcherKey(m.sender)); } catch { /* global tetap default */ }
      return true;
    };

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
        clearWatcherLocation(chatId);
        const alsoG = await mirrorGlobal((k) => clearWatcherLocation(k));
        await m.react("🐣");
        return m.reply(novaBox("Bencana Watch", [
          "Lokasi dihapus. Peringatan wilayah mati, alert umum tetap jalan.",
          ...(alsoG ? ["Lokasi langganan global ikut dihapus."] : []),
        ]));
      }
      try {
        const rec = await setWatcherLocation(chatId, place);
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
      try {
        const rawKm = (m.args || [])[1];
        const rec = setWatcherRadius(chatId, rawKm);
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
        const cur = subs0[chatId]?.kirim || "utama";
        return m.reply(novaBox("Bencana Watch — Kirim", [
          `Mode kirim aktif : ${cur.toUpperCase()}`,
          "---",
          "• utama — otomatis realtime TANPA cooldown, tapi",
          "  tiap pembaruan pusat cuma kirim 1 INFO",
          "  TERPENTING (dekat lokasi > paling parah).",
          "  Info lain gak dikirim — anti-spam.",
          "• semua — semua info tetap dikirim tapi",
          "  dikasih cooldown 10 menit per chat biar gak spam.",
          "---",
          "Contoh : .bencanawatch kirim utama",
          "Contoh : .bencanawatch kirim semua",
        ]));
      }
      try {
        const rec = setWatcherKirim(chatId, v);
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
        const cur = subs0[chatId]?.jenis;
        return m.reply(novaBox("Bencana Watch — Jenis", [
          `Filter aktif : ${Array.isArray(cur) && cur.length ? cur.join(", ") : "semua jenis"}`,
          "---",
          "Pilihan : " + BENCANA_JENIS.join(", "),
          "Contoh  : .bencanawatch jenis gempa",
          `Contoh  : .bencanawatch jenis gempa, banjir`,
          "Reset   : .bencanawatch jenis semua",
          "---",
          "Jenis yang gak dipilih gak dikirim, baik",
          "realtime maupun di rangkuman jadwal.",
        ]));
      }
      try {
        if (rest === "semua" || rest === "all" || rest === "reset") {
          setWatcherJenis(chatId, []);
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
        setWatcherJenis(chatId, kinds);
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
        const cur = subs0[chatId]?.sumber;
        return m.reply(novaBox("Bencana Watch — Sumber", [
          `Filter aktif : ${Array.isArray(cur) && cur.length ? cur.join(", ").toUpperCase() : "semua sumber"}`,
          "---",
          "Pilihan : " + BENCANA_SUMBER.join(", ").toUpperCase(),
          "• BMKG  — gempa Indonesia M 5.0+",
          "• USGS  — gempa global M 6.0+",
          "• GDACS  — bencana dunia level SIAGA/AWAS",
          "---",
          "Contoh  : .bencanawatch sumber bmkg",
          "Contoh  : .bencanawatch sumber bmkg, gdacs",
          "Reset   : .bencanawatch sumber semua",
          "---",
          "Sumber yang gak dipilih gak dikirim, baik",
          "realtime maupun di rangkuman jadwal.",
        ]));
      }
      try {
        if (rest === "semua" || rest === "all" || rest === "reset") {
          setWatcherSumber(chatId, []);
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
        setWatcherSumber(chatId, sources);
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
        return m.reply(novaBox("Bencana Watch — Mode", [
          "3 mode pengiriman alert:",
          "---",
          "• otomatis — semua info bencana baru dikirim",
          "  langsung (default)",
          "• jadwal — dikumpulkan, dikirim rangkuman",
          "  di jam yang di-set (lihat .bencanawatch jadwal)",
          "• darurat — hanya bencana dekat lokasi kamu",
          "  atau bencana besar (gempa M 6.5+, AWAS)",
          "---",
          "Contoh : .bencanawatch mode darurat",
        ]));
      }
      try {
        const rec = setWatcherMode(chatId, mode);
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
          const rec = addWatcherSchedule(chatId, hhmm);
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
          const rec = removeWatcherSchedule(chatId, hhmm);
          const alsoG = await mirrorGlobal((k) => removeWatcherSchedule(k, hhmm));
          await m.react("🐣");
          return m.reply(novaBox("Bencana Watch", [
            `Jadwal dihapus. Sisa: ${rec.schedules.length ? rec.schedules.join(", ") : "kosong"}`,
            ...(alsoG ? ["Jadwal langganan global ikut dihapus."] : []),
          ]));
        }
        if (sub === "clear" || sub === "reset") {
          clearWatcherSchedules(chatId);
          const alsoG = await mirrorGlobal((k) => clearWatcherSchedules(k));
          await m.react("🐣");
          return m.reply(novaBox("Bencana Watch", [
            "Semua jadwal rangkuman dihapus.",
            ...(alsoG ? ["Jadwal langganan global ikut dihapus."] : []),
          ]));
        }
        // list / default
        const subs = await getWatchersSafe();
        const me = subs[chatId];
        const scheds = Array.isArray(me?.schedules) ? me.schedules : [];
        return m.reply(novaBox("Bencana Watch — Jadwal", [
          `Jadwal rangkuman: ${scheds.length ? scheds.join(", ") : "belum ada"}`,
          `Mode pengiriman: ${me?.mode || "otomatis"}`,
          "---",
          "Tambah : .bencanawatch jadwal add 07:00",
          "Hapus  : .bencanawatch jadwal remove 07:00",
          "Reset  : .bencanawatch jadwal clear",
        ]));
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
      return m.reply(novaBox("Bencana Watch", [
        "Auto-alert bencana aktif di chat ini.",
        "---",
        "• Gempa Indonesia baru M 5.0+ (BMKG)",
        "• Gempa global baru M 6.0+ (USGS)",
        "• Bencana GDACS level SIAGA / AWAS",
        "---",
        "MAU INDONESIA SAJA? Pilih sumbernya:",
        "• .bencanawatch sumber bmkg",
        "---",
        "Matikan dengan .bencanawatch off",
      ]));
    }

    // ── scope global: DM owner + semua grup ──
    if (action === "onglobal") {
      await addGlobalWatcher(m.sender);
      syncBencanaMonitor(sock);
      await m.react("🐣");
      return m.reply(novaBox("Bencana Watch", [
        "Mode GLOBAL aktif — DM + semua grup.",
        "---",
        "Alert bencana realtime dikirim ke:",
        "• chat pribadi kamu (DM)",
        "• semua grup yang bot masuk",
        "---",
        "Filter jenis/sumber/mode/lokasi/jadwal yang",
        "di-set dari DM berlaku juga ke langganan global.",
        "Matikan: .bencanawatch offglobal",
      ]));
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
      return m.reply(novaBox("Bencana Watch", [
        `Auto-alert bencana: ${onoff.toUpperCase()} di grup target.`,
        `Grup : ${subject}`,
        onoff === "on"
          ? "Alert bencana otomatis muncul di grup tersebut."
          : "Alert dihentikan di grup tersebut.",
      ]));
    }

    if (action === "on") {
      // di dalam grup: langsung aktif di grup ini (perilaku lama)
      if (!isDm) {
        await addWatcher(chatId);
        syncBencanaMonitor(sock);
        await m.react("🐣");
        return m.reply(novaBox("Bencana Watch", [
          "Auto-alert bencana aktif di grup ini.",
          "---",
          "• Gempa Indonesia baru M 5.0+ (BMKG)",
          "• Gempa global baru M 6.0+ (USGS)",
          "• Bencana GDACS level SIAGA / AWAS",
          "---",
          "MAU INDONESIA SAJA? Pilih sumbernya:",
          "• .bencanawatch sumber bmkg",
          "• .bencanawatch sumber bmkg, gdacs",
          "---",
          "Tips: set lokasi biar dapat peringatan khusus",
          "wilayah: .bencanawatch lokasi <nama kota>",
          "Matikan dengan .bencanawatch off",
        ]));
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
      const me = subs[chatId];
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
      return m.reply(novaBox("Bencana Watch", lines));
    }

    return m.reply(novaGuide("Bencana Watch", "Gunakan on (pilih mode: DM/grup/global), onchat, onglobal, offglobal, off, status, mode <otomatis/jadwal/darurat>, jadwal add/remove <jam>, jenis <bencana>, sumber <bmkg/usgs/gdacs>, kirim <utama/semua>, lokasi <kota>, radius <km>, atau pilihgrup", ".bencanawatch sumber bmkg"));
  } catch (err) {
    console.error("[bencanawatch]", err);
    await m.react("❌");
    return m.reply(novaError("Bencana Watch"));
  }
}

export { pluginConfig as config, handler };
