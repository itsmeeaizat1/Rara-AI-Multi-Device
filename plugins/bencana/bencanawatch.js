// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// bencanawatch.js — Langganan auto-alert bencana per chat (opt-in, default OFF)
//   • Gempa Indonesia baru M >= 5.0 (BMKG)   — poll 60 dtk
//   • Gempa global baru M >= 6.0 (USGS)      — poll 5 mnt
//   • Bencana GDACS baru level SIAGA/AWAS    — poll 5 mnt
// Monitor lazy: timer cuma jalan kalau ada >= 1 subscriber.

import {
  addWatcher, removeWatcher, getWatchersSafe, syncBencanaMonitor, watcherCount,
  setWatcherLocation, clearWatcherLocation, setWatcherRadius, haversineKm,
  setWatcherMode, addWatcherSchedule, removeWatcherSchedule, clearWatcherSchedules,
  setWatcherJenis, BENCANA_JENIS,
} from "../../src/lib/nova-bencana.js";
import { novaBox, novaError, novaGuide } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "bencanawatch",
  alias: ["bencanawatch"],
  category: "bencana",
  description: "Langganan auto-alert bencana realtime di chat ini (gempa BMKG M5+, gempa global M6+, GDACS Siaga/Awas)",
  usage: ".bencanawatch <on/off/status/mode/jadwal/jenis/lokasi/radius>",
  example: ".bencanawatch on",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const args = (m.args || []).map((a) => String(a).toLowerCase());
    const action = args[0] || "";
    const chatId = m.chat;

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
        await m.react("🐣");
        return m.reply(novaBox("Bencana Watch", ["Lokasi dihapus. Peringatan wilayah mati, alert umum tetap jalan."]));
      }
      try {
        const rec = await setWatcherLocation(chatId, place);
        await m.react("🐣");
        return m.reply(novaBox("Bencana Watch", [
          `Lokasi tersimpan.`,
          `Kota    : ${rec.city}`,
          `Detail  : ${rec.detail || "-"}`,
          `Koordinat : ${rec.lat.toFixed(3)}, ${rec.lon.toFixed(3)}`,
          "---",
          "Peringatan wilayah aktif kalau bencana baru masuk",
          `radius monitoring (default 300 km). Atur: .bencanawatch radius 500`,
        ]));
      } catch (e) {
        await m.react("❌");
        return m.reply(novaError("Bencana Watch", e.message));
      }
    }

    // ── set radius monitoring ──
    if (action === "radius" || action === "jarak") {
      try {
        const rec = setWatcherRadius(chatId, (m.args || [])[1]);
        await m.react("🐣");
        return m.reply(novaBox("Bencana Watch", [
          `Radius monitoring: ${rec.radius} km dari ${rec.city || "lokasi kamu"}.`,
          "Bencana baru dalam radius ini → peringatan wilayah.",
        ]));
      } catch (e) {
        await m.react("❌");
        return m.reply(novaError("Bencana Watch", e.message || "Radius harus 50-2000 km. Contoh: .bencanawatch radius 500"));
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
          const rec = setWatcherJenis(chatId, []);
          await m.react("🐣");
          return m.reply(novaBox("Bencana Watch", ["Filter jenis direset — semua jenis bencana dikirim lagi."]));
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
        const rec = setWatcherJenis(chatId, kinds);
        await m.react("🐣");
        return m.reply(novaBox("Bencana Watch", [
          `Filter jenis aktif: ${rec.jenis.join(", ")}`,
          "---",
          "Hanya jenis di atas yang dikirim (semua mode).",
          "Reset: .bencanawatch jenis semua",
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
        await m.react("🐣");
        const expl = {
          otomatis: "Semua bencana baru dikirim langsung. Dekat lokasi → peringatan wilayah, jauh → alert umum.",
          jadwal: "Bencana baru dikumpulkan & dikirim sebagai rangkuman di jam yang di-set. Set jam: .bencanawatch jadwal add 07:00. Bencana DARURAT besar tetap langsung dikirim realtime, gak nunggu rangkuman.",
          darurat: "Hanya bencana paling penting yang dikirim: dekat lokasi kamu (radius) atau bencana besar. Set lokasi dulu biar maksimal: .bencanawatch lokasi <kota>",
        };
        return m.reply(novaBox("Bencana Watch", [
          `Mode: ${rec.mode}`,
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
          const rec = addWatcherSchedule(chatId, (m.args || [])[2]);
          await m.react("🐣");
          return m.reply(novaBox("Bencana Watch", [
            `Jadwal ${rec.schedules.at(-1)} ditambah (mode jadwal aktif).`,
            `Total ${rec.schedules.length} jadwal: ${rec.schedules.join(", ")}`,
            "---",
            "Rangkuman bencana dikirim di jam-jam tersebut.",
            "Bisa tambah bebas: .bencanawatch jadwal add 13:00",
          ]));
        }
        if (sub === "remove" || sub === "hapus" || sub === "del") {
          const rec = removeWatcherSchedule(chatId, (m.args || [])[2]);
          await m.react("🐣");
          return m.reply(novaBox("Bencana Watch", [`Jadwal dihapus. Sisa: ${rec.schedules.length ? rec.schedules.join(", ") : "kosong"}`]));
        }
        if (sub === "clear" || sub === "reset") {
          const rec = clearWatcherSchedules(chatId);
          await m.react("🐣");
          return m.reply(novaBox("Bencana Watch", ["Semua jadwal rangkuman dihapus."]));
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

    if (action === "on") {
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
        "Tips: set lokasi biar dapat peringatan khusus",
        "wilayah: .bencanawatch lokasi <nama kota>",
        "Ganti mode (otomatis/jadwal/darurat):",
        ".bencanawatch mode darurat",
        "---",
        "Matikan dengan .bencanawatch off",
      ]));
    }

    if (action === "off") {
      await removeWatcher(chatId);
      syncBencanaMonitor(sock);
      await m.react("🐣");
      return m.reply(novaBox("Bencana Watch", [
        "Auto-alert bencana dimatikan di chat ini.",
      ]));
    }

    if (action === "status" || action === "") {
      const subs = await getWatchersSafe();
      const me = subs[chatId];
      const active = me
        ? `AKTIF sejak ${me.since.slice(0, 10)}`
        : "TIDAK AKTIF di chat ini";
      const lines = [
        `Status  : ${active}`,
        `Total   : ${Object.keys(subs).length} chat berlangganan`,
        "Sumber  : BMKG, USGS, GDACS",
        `Mode    : ${me?.mode || "otomatis"}`,
      ];
      if ((me?.mode || "otomatis") === "jadwal") {
        lines.push(`Jadwal  : ${(Array.isArray(me.schedules) && me.schedules.length) ? me.schedules.join(", ") : "belum ada — .bencanawatch jadwal add 07:00"}`);
      }
      if (Array.isArray(me?.jenis) && me.jenis.length) {
        lines.push(`Jenis   : ${me.jenis.join(", ")} (filter aktif)`);
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
      if (!me) lines.push("---", "Aktifkan dengan .bencanawatch on");
      return m.reply(novaBox("Bencana Watch", lines));
    }

    return m.reply(novaGuide("Bencana Watch", "Gunakan on, off, status, mode <otomatis/jadwal/darurat>, jadwal add/remove <jam>, jenis <bencana>, lokasi <kota>, atau radius <km>", ".bencanawatch jenis gempa, tsunami"));
  } catch (err) {
    console.error("[bencanawatch]", err);
    await m.react("❌");
    return m.reply(novaError("Bencana Watch"));
  }
}

export { pluginConfig as config, handler };
