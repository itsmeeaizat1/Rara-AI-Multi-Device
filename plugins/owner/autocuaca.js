// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

/**
 * .autocuacav2 — konfigurasi scheduler cuaca rinci BMKG-style (owner only).
 * Default jeda: 3x sehari (06:00, 12:00, 18:00 WIB).
 */

import {
  getCuacaStatus,
  updateCuacaSettings,
  startCuacaJobs,
  stopCuacaJobs,
  geocodeCity,
  fetchDetailedWeather,
  formatDetailedWeather,
  DEFAULT_LOCATIONS,
} from "../../src/lib/nova-bmkg-cuaca-scheduler.js";

const pluginConfig = {
  name: "autocuacav2",
  alias: ["autocuacav2"],
  category: "owner",
  description: "Broadcast cuaca rinci BMKG-style otomatis ke grup/saluran",
  usage: ".autocuacav2 <on/off/add/remove/lokasi/jadwal/status/test>",
  example: ".autocuacav2 on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function formatSchedule(schedules) {
  return (schedules || [])
    .map((s) => String(s.hour).padStart(2, "0") + ":" + String(s.minute ?? 0).padStart(2, "0"))
    .join(", ");
}

function buildSchedules(args) {
  if (!args.length) return null;
  const schedules = [];
  for (const a of args) {
    const match = a.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const h = parseInt(match[1]);
    const m = parseInt(match[2]);
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    schedules.push({ key: "custom" + h, label: h + ":" + String(m).padStart(2, "0"), hour: h, minute: m });
  }
  return schedules;
}

async function handler(m, { sock }) {
  try {
    const args = (m.args || []).map((a) => a.toLowerCase());
    const action = args[0] || "";
    const jid = m.key.remoteJid;

    if (action === "on") {
      const settings = updateCuacaSettings((cur) => ({
        ...cur,
        enabled: false,
        targets: cur.targets.includes(jid) ? cur.targets : [...cur.targets, jid],
      }));
      startCuacaJobs(settings);
      return m.reply(
        "Auto-broadcast cuaca BMKG: *ON*\n\n" +
        "Grup ini otomatis ditambah sebagai target.\n" +
        "Jadwal: " + formatSchedule(settings.schedules) + " WIB\n" +
        "Lokasi: " + settings.locations.length + " kota\n\n" +
        "Atur jadwal: .autocuacav2 jadwal 06:00 12:00 18:00\n" +
        "Tambah lokasi: .autocuacav2 lokasi add Yogyakarta"
      );
    }

    if (action === "off") {
      const settings = updateCuacaSettings((cur) => ({ ...cur, enabled: false }));
      stopCuacaJobs();
      return m.reply(claraWrap("Autocuacav2", "Auto-broadcast cuaca BMKG: *OFF*"));
    }

    if (action === "add") {
      const target = args[1] || jid;
      const settings = updateCuacaSettings((cur) => ({
        ...cur,
        targets: cur.targets.includes(target) ? cur.targets : [...cur.targets, target],
      }));
      if (settings.enabled) startCuacaJobs(settings);
      return m.reply(
        "Target ditambah: " + target + "\n" +
        "Total target: " + settings.targets.length
      );
    }

    if (action === "remove" || action === "del") {
      const target = args[1] || jid;
      const settings = updateCuacaSettings((cur) => ({
        ...cur,
        targets: cur.targets.filter((t) => t !== target),
      }));
      if (settings.enabled) startCuacaJobs(settings);
      return m.reply(
        "Target dihapus: " + target + "\n" +
        "Total target: " + settings.targets.length
      );
    }

    if (action === "jadwal" || action === "schedule") {
      const schedules = buildSchedules(args.slice(1));
      if (!schedules) {
        return m.reply(
          "Format jadwal salah.\n" +
          "Contoh: .autocuacav2 jadwal 06:00 12:00 18:00\n\n" +
          "Default: 06:00, 12:00, 18:00 WIB"
        );
      }
      const settings = updateCuacaSettings((cur) => ({ ...cur, schedules }));
      if (settings.enabled) startCuacaJobs(settings);
      return m.reply(
        "Jadwal disimpan: " + formatSchedule(schedules) + " WIB\n" +
        "Total " + schedules.length + " kali broadcast per hari"
      );
    }

    if (action === "lokasi" || action === "location") {
      const subAction = args[1] || "";

      if (subAction === "add") {
        const cityName = (m.args || []).slice(2).join(" ").trim();
        if (!cityName) {
          return m.reply(claraWrap("Autocuacav2", "Format: .autocuacav2 lokasi add <nama kota>\n💡 *Contoh:* .autocuacav2 lokasi add Yogyakarta"));
        }
        try {
          const loc = await geocodeCity(cityName);
          const settings = updateCuacaSettings((cur) => {
            const exists = cur.locations.some((l) => l.name.toLowerCase() === loc.name.toLowerCase());
            if (exists) return cur;
            return { ...cur, locations: [...cur.locations, loc] };
          });
          if (settings.enabled) startCuacaJobs(settings);
          return m.reply(
            "Lokasi ditambah: *" + loc.name + "*\n" +
            "Provinsi: " + loc.province + "\n" +
            "Koordinat: " + loc.lat + ", " + loc.lon + "\n\n" +
            "Total lokasi: " + settings.locations.length
          );
        } catch (err) {
          return m.reply("Error: " + err.message);
        }
      }

      if (subAction === "remove" || subAction === "del") {
        const cityName = (m.args || []).slice(2).join(" ").trim();
        if (!cityName) {
          return m.reply(claraWrap("Autocuacav2", "Format: .autocuacav2 lokasi remove <nama kota>\n💡 *Contoh:* .autocuacav2 lokasi remove Bandung"));
        }
        const settings = updateCuacaSettings((cur) => ({
          ...cur,
          locations: cur.locations.filter((l) => l.name.toLowerCase() !== cityName.toLowerCase()),
        }));
        if (settings.enabled) startCuacaJobs(settings);
        return m.reply(
          "Lokasi dihapus: " + cityName + "\n" +
          "Total lokasi: " + settings.locations.length
          );
      }

      if (subAction === "list" || !subAction) {
        const status = getCuacaStatus();
        let txt = "╭──「 *DAFTAR LOKASI CUACA* 」\n│\n";
        txt += "╰──────────\n\n";
        for (let i = 0; i < status.locations.length; i++) {
          const loc = status.locations[i];
          txt += (i + 1) + ". " + loc.name;
          if (loc.province) txt += " (" + loc.province + ")";
          txt += "\n";
        }
        txt += "\nTambah: .autocuacav2 lokasi add <kota>\n";
        txt += "Hapus: .autocuacav2 lokasi remove <kota>";
        return await m.reply(claraWrap("autocuacav2", txt));
      }
    }

    if (action === "test" || action === "cek") {
      const status = getCuacaStatus();
      const loc = status.locations[0] || DEFAULT_LOCATIONS[0];
      try {
        const data = await fetchDetailedWeather(loc);
        const txt = formatDetailedWeather(data, loc, "Test");
        return await m.reply(claraWrap("autocuacav2", txt));
      } catch (err) {
        return m.reply("Error: " + err.message);
      }
    }

    // STATUS
    if (action === "status" || action === "list" || !action) {
      const status = getCuacaStatus();
      let txt = "╭──「 *AUTO CUACA BMKG STYLE* 」\n│\n";
      txt += "╰──────────\n\n";
      txt += "Status: *" + (status.enabled ? "ON" : "OFF") + "*\n";
      txt += "Jadwal: " + formatSchedule(status.schedules) + " WIB\n";
      txt += "Lokasi: " + status.locations.length + " kota\n\n";
      txt += "Target (" + status.targets.length + "):\n";
      if (status.targets.length === 0) {
        txt += "(kosong)\n";
      } else {
        for (let i = 0; i < status.targets.length; i++) {
          txt += (i + 1) + ". " + status.targets[i] + "\n";
        }
      }
      txt += "\nLokasi (" + status.locations.length + "):\n";
      for (let i = 0; i < status.locations.length; i++) {
        txt += (i + 1) + ". " + status.locations[i].name;
        if (status.locations[i].province) txt += " (" + status.locations[i].province + ")";
        txt += "\n";
      }
      txt += "\nPerintah:\n";
      txt += "1. .autocuacav2 on — Aktifkan\n";
      txt += "2. .autocuacav2 off — Matikan\n";
      txt += "3. .autocuacav2 add — Tambah grup sebagai target\n";
      txt += "4. .autocuacav2 remove — Hapus target\n";
      txt += "5. .autocuacav2 jadwal 06:00 12:00 — Atur jadwal\n";
      txt += "6. .autocuacav2 lokasi add <kota> — Tambah kota\n";
      txt += "7. .autocuacav2 lokasi remove <kota> — Hapus kota\n";
      txt += "8. .autocuacav2 test — Test fetch cuaca\n\n";
      txt += "Data: Open-Meteo (BMKG-style, 30+ parameter cuaca)\n";
      txt += "Default: 5 kota besar Indonesia";
      return await m.reply(claraWrap("autocuacav2", txt));
    }
  } catch (error) {
    return m.reply("Error: " + error.message);
  }
}

export { pluginConfig as config, handler };
